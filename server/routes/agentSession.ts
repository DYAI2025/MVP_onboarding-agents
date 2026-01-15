
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

interface SessionRequest {
    chart_id: string;
    agent_id: string;
    user_id: string;
}

router.post('/', async (req: Request, res: Response) => {
    try {
        const { chart_id, agent_id, user_id } = req.body as SessionRequest;

        // Validation
        if (!chart_id || !user_id) {
            throw new GatewayError('INVALID_INPUT', 'Missing chart_id or user_id', 400);
        }

        // Create a secure conversation ID
        const conversation_id = uuidv4();

        try {
            const supabase = getSupabaseAdmin();

            // Log the conversation start (Mockup-Free: Real persistence)
            const { error } = await supabase.from('conversations').insert({
                id: conversation_id,
                user_id,
                chart_id,
                agent_id: agent_id || 'unknown',
                status: 'started',
                metadata: {
                    started_at: new Date().toISOString()
                }
            });

            if (error) {
                console.error('Failed to create conversation record:', error);
                // We proceed anyway to not block the user, but log it as critical observability event
            }
        } catch (adminError: any) {
            console.warn('Supabase Admin requested but not available. Logging to DB skipped.', adminError.message);
        }

        // Generate the Session Token for the Agent
        // This token allows the Agent to call back to /api/agent/tools/*
        const session_token = jwt.sign({
            conversation_id,
            user_id,
            chart_id,
            agent_id
        }, JWT_SECRET, { expiresIn: '1h' });

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
        console.error('Session creation failed', error);
        res.status(500).json({ error: 'Internal Server Error', req_id: req.id });
    }
});

export default router;
