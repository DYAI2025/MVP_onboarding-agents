import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
    throw new Error('[FATAL] SESSION_SECRET not set. Server cannot start without session secret.');
}

interface JWTPayload {
    conversation_id: string;
    user_id: string;
    chart_id: string;
    agent_id: string;
}

// Tool: Get User Context
// Called by ElevenLabs Agent to retrieve user's chart and conversation history.
// Auth: Bearer JWT (from /api/agent/session)
router.post('/get_user_context', async (req: Request, res: Response) => {
    try {
        // 1. Extract and verify JWT from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            throw new GatewayError('UNAUTHORIZED', 'Missing session token', 401);
        }

        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, SESSION_SECRET) as JWTPayload;
        } catch (e) {
            throw new GatewayError('UNAUTHORIZED', 'Invalid or expired token', 401);
        }

        const { user_id, chart_id, conversation_id } = decoded;

        const supabase = getSupabaseAdmin();

        // 2. Verify chart exists and belongs to user (scoping rule)
        const { data: chart, error: chartError } = await supabase
            .from('charts')
            .select('id, user_id, birth_json, analysis_json')
            .eq('id', chart_id)
            .eq('user_id', user_id) // CRITICAL: prevent cross-user access
            .single();

        if (chartError || !chart) {
            throw new GatewayError('CHART_NOT_FOUND', `Chart ${chart_id} not found or does not belong to user`, 404);
        }

        // 3. Verify conversation exists and belongs to user (scoping rule)
        const { data: currentConv, error: convError } = await supabase
            .from('conversations')
            .select('id, chart_id')
            .eq('id', conversation_id)
            .eq('user_id', user_id) // CRITICAL: prevent cross-user access
            .single();

        if (convError || !currentConv) {
            throw new GatewayError('FORBIDDEN', `Conversation ${conversation_id} not found or does not belong to user`, 403);
        }

        // 4. Verify conversation.chart_id matches JWT.chart_id (scoping rule)
        if (currentConv.chart_id !== chart_id) {
            throw new GatewayError('FORBIDDEN', `Conversation ${conversation_id} does not belong to chart ${chart_id}`, 403);
        }

        // 5. Fetch all conversations for this user (for context)
        const { data: conversations, error: convsError } = await supabase
            .from('conversations')
            .select('id, started_at, ended_at, status')
            .eq('user_id', user_id)
            .order('started_at', { ascending: false });

        if (convsError) {
            console.error('[AgentTools] Failed to fetch conversations:', convsError);
            // Non-critical, continue with empty list
        }

        // 6. Return scoped data (only this user's chart and conversations)
        res.json({
            user_id,
            chart: {
                id: chart.id,
                birth: chart.birth_json,
                analysis: chart.analysis_json
            },
            conversations: conversations || []
        });

    } catch (error: unknown) {
        if (error instanceof GatewayError) {
            res.status(error.statusCode).json(formatErrorResponse(error, req.id));
            return;
        }
        console.error('[AgentTools] Unexpected error:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Tool execution failed' }, request_id: req.id });
    }
});

export default router;
