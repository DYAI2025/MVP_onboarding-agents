
import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// Receives "Post Call" webhook from ElevenLabs
// This must be configured in the ElevenLabs Agent settings to point to:
// https://<gateway-url>/api/webhooks/elevenlabs/post-call
router.post('/post-call', async (req: Request, res: Response) => {
    try {
        console.log("[ElevenLabs Webhook] Received post-call data");
        // Log basic info for debugging
        const { conversation_id, agent_id, status } = req.body;

        // MVP: Just persist the raw body to the conversations table (or specific logs)
        // We attempt to find the conversation by internal ID if possible, 
        // using the 'custom_variables' logic if ElevenLabs passes it back.
        // Assuming req.body.analysis (from dynamic vars?) or just raw transcript.

        const supabase = getSupabaseAdmin();

        // We'll update records where eleven_conversation_id matches OR insert new
        // Note: For this to work perfectly, we need to have stored the eleven_id earlier 
        // or rely on 'custom_variables.conversation_id' matching our internal ID.

        const internalId = req.body.custom_variables?.conversation_id;

        if (internalId) {
            console.log(`[ElevenLabs Webhook] Linking to internal conversation: ${internalId}`);

            await supabase.from('conversations').update({
                eleven_conversation_id: conversation_id,
                transcript: req.body.transcript, // assuming transcript is in body
                status: 'completed',
                metadata: req.body, // store full payload
                ended_at: new Date().toISOString()
            }).eq('id', internalId);

            // Here we would trigger the 'generate_report' job
            await supabase.from('jobs').insert({
                type: 'generate_report',
                status: 'pending',
                payload: { conversation_id: internalId }
            });

        } else {
            console.log(`[ElevenLabs Webhook] No internal ID found. Storing as orphan.`);
            // Orphan logic (optional for MVP)
        }

        res.json({ status: 'ok' });

    } catch (error) {
        console.error("[ElevenLabs Webhook] Error:", error);
        res.status(500).json({ error: 'Webhook handling failed' });
    }
});

export default router;
