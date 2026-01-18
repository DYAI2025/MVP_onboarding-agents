import { Worker, Job } from 'bullmq';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { redis } from '../lib/redis';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const reportWorker = new Worker('report-generation', async (job: Job) => {
  const { conversation_id, job_id } = job.data;
  console.log(`[ReportWorker] Processing job for conversation ${conversation_id}`);

  const supabase = getSupabaseAdmin();

  // 1. Update Job Status to 'processing' (if job_id provided, otherwise skip updates to jobs table if strictly using queue)
  // We assume there's a row in 'jobs' table corresponding to this. Ideally we pass that ID.
  // But the webhook inserts into 'jobs' table first. Let's try to update based on payload match or just ignore if we can't link it easily without ID.
  // The webhook payload is { conversation_id }.
  // Let's update any 'queued' job for this conversation_id.
  
  if (!ai) {
      throw new Error("GEMINI_API_KEY not set");
  }

  try {
      await supabase
        .from('jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('payload->>conversation_id', conversation_id)
        .eq('status', 'queued');

      // 2. Fetch Conversation & linked Chart
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
            *,
            charts (
                analysis_json,
                birth_json
            )
        `)
        .eq('id', conversation_id)
        .single();

      if (convError || !conversation) {
          throw new Error(`Conversation not found: ${convError?.message}`);
      }

      const transcript = conversation.transcript || [];
      const analysis = conversation.charts?.analysis_json;
      
      if (!transcript.length) {
          console.warn('[ReportWorker] Empty transcript, generating brief summary.');
      }

      // 3. Generate Report via Gemini
      const prompt = `
        ROLE: Expert Astrologer and Life Coach.
        TASK: Generate a "Cosmic Insight Report" based on the user's astrological chart and their recent conversation with an AI agent.
        
        CONTEXT:
        User Chart Highlights: ${JSON.stringify(analysis).substring(0, 1000)}...
        Conversation Transcript: ${JSON.stringify(transcript).substring(0, 5000)}...
        
        OUTPUT FORMAT: Markdown.
        SECTIONS:
        1. **Core Alignment**: How the user's questions align with their chart.
        2. **Key Takeaways**: 3 actionable insights from the chat.
        3. **Cosmic Outlook**: A brief forecast or encouragement based on the chart.
        
        Keep it concise, encouraging, and mystical but grounded.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ text: prompt }],
      });
      
      const reportContent = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No report generated.';

      // 4. Save Report
      const { error: saveError } = await supabase
        .from('conversations')
        .update({ 
            report: reportContent,
            report_generated_at: new Date().toISOString() 
        })
        .eq('id', conversation_id);
    
      if (saveError) {
          throw new Error(`Failed to save report: ${saveError.message}`);
      }

      // 5. Update Job Status to 'completed'
      await supabase
        .from('jobs')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('payload->>conversation_id', conversation_id)
        .eq('status', 'processing');

      console.log(`[ReportWorker] Report generated for ${conversation_id}`);
      return { status: 'success', conversation_id };

  } catch (error: any) {
      console.error(`[ReportWorker] Failed: ${error.message}`);
      
      // Update Job Status to 'failed'
      await supabase
        .from('jobs')
        .update({ 
            status: 'failed', 
            error: error.message,
            updated_at: new Date().toISOString() 
        })
        .eq('payload->>conversation_id', conversation_id)
        // We target 'processing' or 'queued' to be safe
        .in('status', ['queued', 'processing']);
        
      throw error;
  }
}, {
  // Use the connection logic from redis.ts but BullMQ needs a fresh connection for blocking pops usually,
  // or we can pass the existing client. Standard practice is providing connection IS.
  // But since we exported 'redis' as a client, reusing it might block it if we use blocking commands?
  // BullMQ workers DO use blocking commands (BRPOP).
  // Check lib/redis.ts: we export 'redis' which is one client.
  // Recommendation: Create new connection for worker.
  connection: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      maxRetriesPerRequest: null
  }
});
