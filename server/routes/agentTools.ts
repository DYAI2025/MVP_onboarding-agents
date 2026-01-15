
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

// Tool: Get User Context
// Called by ElevenLabs Agent to "remember" who it is talking to.
router.post('/get_user_context', async (req: Request, res: Response) => {
    try {
        const { session_token } = req.body;

        if (!session_token) {
            res.status(401).json({ error: 'Missing session_token' });
            return;
        }

        // Verify Token
        let decoded: any;
        try {
            decoded = jwt.verify(session_token, JWT_SECRET);
        } catch (e) {
            res.status(403).json({ error: 'Invalid or expired token' });
            return;
        }

        const { user_id, chart_id } = decoded;

        // Fetch Secure Data from Supabase
        const supabase = getSupabaseAdmin();
        const { data: chart, error } = await supabase
            .from('charts')
            .select('analysis_json')
            .eq('id', chart_id)
            .single();

        if (error || !chart) {
            res.status(404).json({ error: 'Chart not found' });
            return;
        }

        // Return only what the agent needs (Safe Subset)
        const analysis = chart.analysis_json;
        const result = {
            user_context: {
                id: user_id,
                // In real app, name/preferences from 'profiles' table
            },
            astrology_context: {
                western: analysis.western,
                eastern: analysis.eastern,
                synthesis: analysis.synthesisTitle
            }
        };

        res.json(result);

    } catch (error) {
        console.error('Tool execution failed', error);
        res.status(500).json({ error: 'Tool execution failed' });
    }
});

export default router;
