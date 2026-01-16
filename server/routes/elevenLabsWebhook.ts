import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();

const WEBHOOK_SECRET = process.env.ELEVENLABS_TOOL_SECRET;

if (!WEBHOOK_SECRET) {
    console.error('[FATAL] ELEVENLABS_TOOL_SECRET not set. Webhook endpoint will reject all requests.');
}

// Receives "Post Call" webhook from ElevenLabs
// This must be configured in the ElevenLabs Agent settings to point to:
// https://<gateway-url>/api/webhooks/elevenlabs/post-call
router.post('/post-call', async (req: Request, res: Response) => {
    try {
        // 1. Auth: verify webhook secret (fail loud if missing/invalid)
        const authHeader = req.headers.authorization;
        const providedSecret = authHeader?.replace('Bearer ', '');

        if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
            throw new GatewayError('UNAUTHORIZED', 'Invalid or missing webhook secret', 401);
        }

        console.log('[ElevenLabs Webhook] Received post-call data');
        const { conversation_id: elevenConvId, agent_id, status, transcript, custom_variables } = req.body;

        // 2. Extract internal conversation_id from custom_variables
        const internalId = custom_variables?.conversation_id;

        if (!internalId) {
            throw new GatewayError('INVALID_INPUT', 'Missing custom_variables.conversation_id', 400);
        }

        console.log(`[ElevenLabs Webhook] Linking to internal conversation: ${internalId}`);

        const supabase = getSupabaseAdmin();

        // 3. Update conversation with transcript and metadata (fail loud on error)
        const { error: updateError } = await supabase.from('conversations').update({
            eleven_conversation_id: elevenConvId,
            transcript: transcript || null,
            status: 'completed',
            metadata: req.body, // store full payload
            ended_at: new Date().toISOString()
        }).eq('id', internalId);

        if (updateError) {
            console.error('[ElevenLabs Webhook] DB update failed:', updateError);
            throw new GatewayError('DB_UPDATE_FAILED', `Failed to update conversation: ${updateError.message}`, 500);
        }

        // 4. Verify conversation exists (if update affected 0 rows, conversation not found)
        const { data: conversation, error: fetchError } = await supabase
            .from('conversations')
            .select('id, user_id')
            .eq('id', internalId)
            .single();

        if (fetchError || !conversation) {
            throw new GatewayError('CONVERSATION_NOT_FOUND', `Conversation ${internalId} not found`, 404);
        }

        // 5. Create job for report generation (fail loud on error)
        const { error: jobError } = await supabase.from('jobs').insert({
            user_id: conversation.user_id,
            type: 'report', // MUST match CHECK constraint: ('report','pdf','email')
            status: 'queued',
            payload: { conversation_id: internalId }
        });

        if (jobError) {
            console.error('[ElevenLabs Webhook] Job creation failed:', jobError);
            throw new GatewayError('DB_INSERT_FAILED', `Failed to create report job: ${jobError.message}`, 500);
        }

        res.json({ status: 'ok', request_id: req.id });

    } catch (error: unknown) {
        if (error instanceof GatewayError) {
            res.status(error.statusCode).json(formatErrorResponse(error, req.id));
            return;
        }
        console.error('[ElevenLabs Webhook] Unexpected error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Webhook handling failed' }, request_id: req.id });
    }
});

export default router;
