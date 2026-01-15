import { Router, Request, Response } from 'express';
import { baziEngine, BirthInput } from '../lib/baziEngineClient';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';
import { GatewayError, formatErrorResponse } from '../lib/errors';

const router = Router();

interface AnalysisRequest {
  birth: BirthInput;
  user_id: string; // MANDATORY (from Supabase Auth)
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
  try {
    const { birth, user_id } = req.body as AnalysisRequest;

    // 1. Validate input (fail loud on missing fields)
    if (!user_id) {
      throw new GatewayError('INVALID_INPUT', 'Missing user_id (authentication required)', 400);
    }

    if (!birth || !birth.date || !birth.time || !birth.lat || !birth.lon) {
      throw new GatewayError('INVALID_INPUT', 'Missing required birth data fields (date, time, lat, lon)', 400);
    }

    // 2. Call BaziEngine (fail loud if unavailable)
    let baziResult: EasternResult;
    let westernResult: WesternResult;

    try {
      const enginePayload = baziEngine.transformBirthData(birth);
      [baziResult, westernResult] = await Promise.all([
        baziEngine.calculateBazi(enginePayload),
        baziEngine.calculateWestern(enginePayload)
      ]) as [EasternResult, WesternResult];
    } catch (engineError: unknown) {
      console.error('[Analysis] BaziEngine call failed:', engineError);
      const message = engineError instanceof Error ? engineError.message : 'BaziEngine not reachable';
      throw new GatewayError('ENGINE_UNAVAILABLE', `BaziEngine failed: ${message}`, 500);
    }

    // 3. Combine results
    const analysis = {
      western: westernResult,
      eastern: baziResult,
      synthesisTitle: generateSynthesisTitle(westernResult, baziResult),
      synthesisDescription: generateSynthesisDescription(westernResult, baziResult),
      elementMatrix: `${westernResult.element || 'Unknown'} (Sun) / ${baziResult.dayElement || 'Unknown'} (Day Master)`,
      prompt: generateSymbolPrompt(westernResult, baziResult)
    };

    // 4. Persist to Supabase (fail loud on error)
    const supabase = getSupabaseAdmin();
    const { data, error: insertError } = await supabase
      .from('charts')
      .insert({
        user_id,
        birth_json: birth,
        analysis_json: analysis
      })
      .select('id')
      .single();

    if (insertError || !data) {
      console.error('[Analysis] DB insert failed:', insertError);
      throw new GatewayError('DB_INSERT_FAILED', `Failed to save chart: ${insertError?.message || 'unknown error'}`, 500);
    }

    const chart_id = data.id;

    // 5. Return success response
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
    console.error('[Analysis] Unexpected error:', error);
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
