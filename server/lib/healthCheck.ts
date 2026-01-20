import { redis } from './redis';
import { getSupabaseAdmin } from './supabaseAdmin';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    redis: {
      status: 'ok' | 'error' | 'skipped';
      message?: string;
    };
    supabase: {
      status: 'ok' | 'error' | 'skipped';
      message?: string;
    };
    gemini: {
      status: 'ok' | 'error';
      message?: string;
    };
  };
}

export async function performHealthCheck(): Promise<HealthStatus> {
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = {
    redis: { status: 'skipped' },
    supabase: { status: 'skipped' },
    gemini: { status: 'ok' }
  };

  // Check Redis connection
  try {
    if (redis && typeof redis.ping === 'function') {
      const pong = await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      checks.redis.status = pong === 'PONG' ? 'ok' : 'error';
    } else {
      checks.redis.status = 'skipped';
      checks.redis.message = 'Running without Redis (local dev mode)';
    }
  } catch (err) {
    checks.redis.status = 'error';
    checks.redis.message = err instanceof Error ? err.message : 'Redis ping failed';
  }

  // Check Supabase connection
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await Promise.race([
        supabase.from('charts').select('id').limit(1),
        new Promise<{ error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 2000)
        )
      ]);
      checks.supabase.status = !error ? 'ok' : 'error';
      if (error) {
        checks.supabase.message = error.message;
      }
    } else {
      checks.supabase.status = 'skipped';
      checks.supabase.message = 'Supabase not configured';
    }
  } catch (err) {
    checks.supabase.status = 'error';
    checks.supabase.message = err instanceof Error ? err.message : 'Supabase check failed';
  }

  // Check Gemini API key presence
  if (!process.env.GEMINI_API_KEY) {
    checks.gemini.status = 'error';
    checks.gemini.message = 'GEMINI_API_KEY not configured';
  }

  // Determine overall status
  const hasErrors = Object.values(checks).some(check => check.status === 'error');
  const hasWarnings = Object.values(checks).some(check => check.status === 'skipped');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (hasErrors) {
    overallStatus = 'unhealthy';
  } else if (hasWarnings) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  return {
    status: overallStatus,
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks
  };
}

// Simple health check for Railway's healthcheck
export async function simpleHealthCheck(): Promise<{ status: string; version: string }> {
  return {
    status: 'ok',
    version: '1.0.0'
  };
}
