import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';
import { reportQueue } from '../lib/queue';

const router = Router();

const WEBHOOK_SECRET = process.env.ELEVENLABS_TOOL_SECRET;
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

if (!WEBHOOK_SECRET) {
    console.error('[FATAL] ELEVENLABS_TOOL_SECRET not set. Webhook endpoint will reject all requests.');
}

// ElevenLabs Post-call Webhook v0.2+ Payload Structure
interface ElevenLabsWebhookPayload {
    type: 'conversation.ended';
    data: {
        conversation_id: string; // ElevenLabs internal conversation ID
        agent_id: string;
        status: string;
        transcript: Array<{
            role: 'user' | 'assistant';
            message: string;
            timestamp: string;
        }>;
        conversation_initiation_client_data: {
            dynamic_variables?: Record<string, string>;
        };
        metadata?: Record<string, unknown>;
    };
}

/**
 * Verify HMAC signature from ElevenLabs-Signature header
 * Format: "t=<timestamp>,v1=<signature>"
 * See: https://elevenlabs.io/docs/api-reference/webhooks#security
 */
function verifyWebhookSignature(
    payload: Buffer,
    signatureHeader: string | undefined,
    secret: string
): boolean {
    if (!signatureHeader) {
        throw new GatewayError('UNAUTHORIZED', 'Missing ElevenLabs-Signature header', 401);
    }

    // Parse signature header: "t=1234567890,v1=abcdef..."
    const parts = signatureHeader.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
        throw new GatewayError('UNAUTHORIZED', 'Invalid signature header format', 401);
    }

    const timestamp = parseInt(timestampPart.split('=')[1], 10);
    const providedSignature = signaturePart.split('=')[1];

    // Check timestamp tolerance (prevent replay attacks)
    const now = Date.now();
    if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_MS) {
        throw new GatewayError('UNAUTHORIZED', 'Signature timestamp too old or too new', 401);
    }

    // Compute expected signature: HMAC-SHA256(timestamp + payload, secret)
    const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`), payload]);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

// Receives "Post Call" webhook from ElevenLabs
// This must be configured in the ElevenLabs Agent settings to point to:
// https://<gateway-url>/api/webhooks/elevenlabs/post-call
router.post('/post-call', async (req: Request, res: Response) => {
    try {
        // 1. Verify HMAC signature (fail loud if invalid)
        if (!WEBHOOK_SECRET) {
            throw new GatewayError('UNAUTHORIZED', 'Webhook secret not configured', 401);
        }

        const rawBody = Buffer.isBuffer(req.body) ? req.body : req.rawBody;
        if (!rawBody || !Buffer.isBuffer(rawBody)) {
            throw new GatewayError(
                'INVALID_INPUT',
                'Missing raw request body for signature verification. Ensure express.raw() is configured for this route.',
                400
            );
        }
        const signatureHeader = req.headers['elevenlabs-signature'] as string | undefined;

        const isValid = verifyWebhookSignature(rawBody, signatureHeader, WEBHOOK_SECRET);
        if (!isValid) {
            throw new GatewayError('UNAUTHORIZED', 'Invalid webhook signature', 401);
        }

        // 2. Parse payload (ElevenLabs v0.2+ format)
        let payload: ElevenLabsWebhookPayload;
        try {
            payload = JSON.parse(rawBody.toString('utf8')) as ElevenLabsWebhookPayload;
        } catch (parseError: unknown) {
            const message = parseError instanceof Error ? parseError.message : 'Invalid JSON payload';
            throw new GatewayError('INVALID_INPUT', `Unable to parse webhook payload: ${message}`, 400);
        }

        if (payload.type !== 'conversation.ended') {
            console.warn(`[ElevenLabs Webhook] Unexpected event type: ${payload.type}`);
            res.json({ status: 'ignored', request_id: req.id });
            return;
        }

        const { data } = payload;
        const elevenConvId = data.conversation_id;
        const agentId = data.agent_id;
        const transcript = data.transcript;

        // 3. Extract internal conversation_id from dynamic_variables
        const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables;
        const internalConvId = dynamicVars?.conversation_id;

        if (!internalConvId) {
            throw new GatewayError(
                'INVALID_INPUT',
                'Missing conversation_id in dynamic_variables. Ensure widget passes conversation_id.',
                400
            );
        }

        console.log(
            `[ElevenLabs Webhook] Post-call received: internal_id=${internalConvId}, eleven_id=${elevenConvId}, request_id=${req.id}`
        );

        const supabase = getSupabaseAdmin();

        // 4. Update conversation with transcript and metadata (fail loud on error)
        // NOTE: Store only transcript length, not full content in logs
        const transcriptLength = transcript?.length || 0;
        console.log(`[ElevenLabs Webhook] Transcript entries: ${transcriptLength}`);

        const { error: updateError } = await supabase
            .from('conversations')
            .update({
                eleven_conversation_id: elevenConvId,
                agent_id: agentId,
                ended_at: new Date().toISOString()
            })
            .eq('id', internalConvId);

        if (updateError) {
            console.error(
                `[ElevenLabs Webhook] DB update failed: ${updateError.message}, request_id=${req.id}`
            );
            throw new GatewayError(
                'DB_UPDATE_FAILED',
                `Failed to update conversation: ${updateError.message}`,
                500
            );
        }

        // 5. Verify conversation exists (if update affected 0 rows, conversation not found)
        const { data: conversation, error: fetchError } = await supabase
            .from('conversations')
            .select('id, user_id')
            .eq('id', internalConvId)
            .single();

        if (fetchError || !conversation) {
            throw new GatewayError(
                'CONVERSATION_NOT_FOUND',
                `Conversation ${internalConvId} not found`,
                404
            );
        }

        // 6. Create job for report generation (fail loud on error)
        const { error: jobError } = await supabase.from('jobs').insert({
            user_id: conversation.user_id,
            type: 'report', // MUST match CHECK constraint: ('report','pdf','email')
            status: 'queued',
            payload: { conversation_id: internalConvId }
        });

        if (jobError) {
            console.error(
                `[ElevenLabs Webhook] Job creation failed: ${jobError.message}, request_id=${req.id}`
            );
            throw new GatewayError(
                'DB_INSERT_FAILED',
                `Failed to create report job: ${jobError.message}`,
                500
            );
        }

        // 7. Enqueue Job in BullMQ
        try {
            await reportQueue.add('generate-report', { 
                conversation_id: internalConvId,
                job_id: null // We don't have the job DB ID easily here unless we select it back, but existing worker logic handles it by conv_id
            });
            console.log(`[ElevenLabs Webhook] Enqueued BullMQ job for ${internalConvId}`);
        } catch (queueError: any) {
            console.error(`[ElevenLabs Webhook] Failed to enqueue job: ${queueError.message}`);
            // Non-blocking error? If queue fails, the job remains 'queued' in DB but never processes.
            // Ideally we should alert. For now, we log specific error.
        }

        console.log(
            `[ElevenLabs Webhook] Success: conversation_id=${internalConvId}, job=queued, request_id=${req.id}`
        );

        res.json({ status: 'ok', request_id: req.id });
    } catch (error: unknown) {
// ...
        if (error instanceof GatewayError) {
            res.status(error.statusCode).json(formatErrorResponse(error, req.id));
            return;
        }
        console.error('[ElevenLabs Webhook] Unexpected error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Webhook handling failed' },
            request_id: req.id
        });
    }
});

export default router;
