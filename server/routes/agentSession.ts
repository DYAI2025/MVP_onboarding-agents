import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();

const getSessionSecret = () => {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error('[FATAL] SESSION_SECRET not set. Server cannot start without session secret.');
    }
    return secret;
};

interface SessionRequest {
    chart_id: string;
    agent_id: string;
    user_id: string;
}

router.post('/', async (req: Request, res: Response) => {
    try {
        const { chart_id, agent_id, user_id } = req.body as SessionRequest;

        // 1. Validation (fail loud on missing fields)
        if (!chart_id || !user_id) {
            throw new GatewayError('INVALID_INPUT', 'Missing chart_id or user_id', 400);
        }

        const supabase = getSupabaseAdmin();

        // 2. Verify chart exists and belongs to user (fail loud if not)
        const { data: chart, error: chartError } = await supabase
            .from('charts')
            .select('id, user_id')
            .eq('id', chart_id)
            .eq('user_id', user_id)
            .single();

        if (chartError || !chart) {
            throw new GatewayError('CHART_NOT_FOUND', `Chart ${chart_id} not found or does not belong to user ${user_id}`, 404);
        }

        // 3. Create conversation ID
        const conversation_id = uuidv4();

        // 4. Insert conversation (fail loud on error)
        const { error: insertError } = await supabase.from('conversations').insert({
            id: conversation_id,
            user_id,
            chart_id,
            agent_id: agent_id || 'unknown',
            status: 'started', // MUST match CHECK constraint: ('started','active','completed','failed')
            metadata: {
                started_at: new Date().toISOString()
            }
        });

        if (insertError) {
            console.error('[AgentSession] DB insert failed:', insertError);
            throw new GatewayError('DB_INSERT_FAILED', `Failed to create conversation: ${insertError.message}`, 500);
        }

        // 5. Generate JWT session token (valid 1h)
        const session_token = jwt.sign({
            conversation_id,
            user_id,
            chart_id,
            agent_id
        }, getSessionSecret(), { expiresIn: '1h' });

        res.json({
            status: 'created',
            session_token,
            conversation_id,
            valid_until: Date.now() + 3600000 // 1h
        });

    } catch (error: unknown) {
        if (error instanceof GatewayError) {
            res.status(error.statusCode).json(formatErrorResponse(error, req.id));
            return;
        }
        console.error('[AgentSession] Unexpected error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Session creation failed' }, request_id: req.id });
    }
});

export default router;
