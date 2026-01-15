/**
 * Symbol Generation Service
 *
 * Production-first: Calls gateway only, no fallbacks.
 * Errors are surfaced to the UI via ErrorCard.
 */

import { REMOTE_SYMBOL_ENDPOINT } from '../src/config';

// Determine API endpoint based on deployment
const getApiEndpoint = (): string => {
  // If a remote endpoint is explicitly configured (e.g., for Vercel static hosting),
  // use it. Otherwise, use local /api/symbol which works for:
  // - Development (Vite proxy -> localhost:8787)
  // - Production on Fly.io (same-origin, backend serves frontend)
  const remoteUrl = REMOTE_SYMBOL_ENDPOINT;
  const isRemoteConfigured = remoteUrl && !remoteUrl.includes('localhost') && remoteUrl !== '/api/symbol';

  if (isRemoteConfigured && import.meta.env.PROD) {
    return remoteUrl;
  }
  return '/api/symbol';
};

export interface SymbolConfig {
  influence: 'western' | 'balanced' | 'eastern';
  transparentBackground?: boolean;
}

export interface GenerationResult {
  imageUrl: string;
  storagePath?: string | null;
  engine: string;
  durationMs?: number;
  requestId?: string;
}

export class SymbolGenerationError extends Error {
  public readonly code: string;
  public readonly requestId?: string;

  constructor(code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'SymbolGenerationError';
    this.code = code;
    this.requestId = requestId;
  }
}

/**
 * Generates a symbol via the gateway API.
 * No fallbacks - errors are thrown and should be handled by the UI.
 */
export const generateSymbol = async (
  basePrompt: string,
  config?: SymbolConfig
): Promise<GenerationResult> => {
  const payload = {
    prompt: basePrompt,
    style: config?.influence || 'balanced',
    mode: config?.transparentBackground ? 'transparent' : 'cinematic'
  };

  try {
    const response = await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30s timeout for generation
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const code = errorData?.error?.code || 'GENERATION_FAILED';
      const message = errorData?.error?.message || `Server returned ${response.status}`;
      const requestId = errorData?.request_id;
      throw new SymbolGenerationError(code, message, requestId);
    }

    const data = await response.json();

    if (!data.imageUrl && !data.imageDataUrl) {
      throw new SymbolGenerationError(
        'NO_IMAGE_DATA',
        'Server response missing image data',
        data.request_id
      );
    }

    return {
      imageUrl: data.imageUrl || data.imageDataUrl,
      storagePath: data.storagePath || null,
      engine: data.engine || 'gateway',
      durationMs: data.durationMs,
      requestId: data.request_id
    };

  } catch (error) {
    if (error instanceof SymbolGenerationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        throw new SymbolGenerationError('TIMEOUT', 'Symbol generation timed out');
      }
      throw new SymbolGenerationError('NETWORK_ERROR', error.message);
    }

    throw new SymbolGenerationError('UNKNOWN_ERROR', 'An unexpected error occurred');
  }
};
