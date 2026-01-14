import { Router, Request, Response } from 'express';
import { baziEngine, BirthInput } from '../lib/baziEngineClient';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();

interface AnalysisRequest {
  birth: BirthInput;
  user_id?: string; // Optional: for authenticated requests
}

interface WesternResult {
  element?: string;
  sunSign?: string;
}

interface EasternResult {
  dayElement?: string;
  yearAnimal?: string;
  yearElement?: string;
}

router.post('/', async (req: Request, res: Response) => {
  const { birth, user_id } = req.body as AnalysisRequest;

  // Validate input
  if (!birth || !birth.date || !birth.time || !birth.lat || !birth.lon) {
    const error = new GatewayError('INVALID_INPUT', 'Missing required birth data fields', 400);
    res.status(error.statusCode).json(formatErrorResponse(error, req.id));
    return;
  }

  try {
    // Transform to engine format
    const enginePayload = baziEngine.transformBirthData(birth);

    // Call both engines in parallel
    const [baziResult, westernResult] = await Promise.all([
      baziEngine.calculateBazi(enginePayload),
      baziEngine.calculateWestern(enginePayload)
    ]) as [EasternResult, WesternResult];

    // Combine results
    const analysis = {
      western: westernResult,
      eastern: baziResult,
      synthesisTitle: generateSynthesisTitle(westernResult, baziResult),
      synthesisDescription: generateSynthesisDescription(westernResult, baziResult),
      elementMatrix: `${westernResult.element || 'Unknown'} (Sun) / ${baziResult.dayElement || 'Unknown'} (Day Master)`,
      prompt: generateSymbolPrompt(westernResult, baziResult)
    };

    // Persist to Supabase if user_id provided
    let chart_id: string | null = null;
    if (user_id) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('charts')
          .insert({
            user_id,
            birth_json: birth,
            analysis_json: analysis
          })
          .select('id')
          .single();

        if (error) {
          console.error(JSON.stringify({ type: 'db_error', error: error.message, req_id: req.id }));
        } else {
          chart_id = data.id;
        }
      } catch (dbError) {
        // Log but don't fail the request
        console.error(JSON.stringify({ type: 'db_error', error: 'Supabase not configured', req_id: req.id }));
      }
    }

    res.json({
      chart_id,
      analysis,
      request_id: req.id
    });

  } catch (error: unknown) {
    if (error instanceof GatewayError) {
      res.status(error.statusCode).json(formatErrorResponse(error, req.id));
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    const gatewayError = new GatewayError('ANALYSIS_FAILED', message, 500);
    res.status(gatewayError.statusCode).json(formatErrorResponse(gatewayError, req.id));
  }
});

// Helper functions (simplified - real logic from astroPhysics.ts)
function generateSynthesisTitle(western: WesternResult, eastern: EasternResult): string {
  const element = western.element || 'Unknown';
  const animal = eastern.yearAnimal || 'Unknown';
  return `The ${element} ${animal}`;
}

function generateSynthesisDescription(western: WesternResult, eastern: EasternResult): string {
  return `A fusion of ${western.sunSign || 'Unknown'} energy with ${eastern.yearElement || 'Unknown'} ${eastern.yearAnimal || 'Unknown'} wisdom.`;
}

function generateSymbolPrompt(western: WesternResult, eastern: EasternResult): string {
  return `Design a fusion symbol combining ${western.sunSign || 'Unknown'} (${western.element || 'Unknown'}) with ${eastern.yearAnimal || 'Unknown'} (${eastern.yearElement || 'Unknown'}).`;
}

export default router;
