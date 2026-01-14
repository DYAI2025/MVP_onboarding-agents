import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { generateSymbol, SymbolGenerationError } from './geminiService';

global.fetch = vi.fn();

describe('geminiService (Gateway-Only)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns image data on successful response', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        imageUrl: 'https://storage.supabase.co/symbols/test.png',
        storagePath: 'generated/test.png',
        engine: 'proxy-gemini',
        durationMs: 1500,
        request_id: 'req-123'
      }),
    });

    const result = await generateSymbol('test prompt');

    expect(result.imageUrl).toBe('https://storage.supabase.co/symbols/test.png');
    expect(result.storagePath).toBe('generated/test.png');
    expect(result.engine).toBe('proxy-gemini');
    expect(result.requestId).toBe('req-123');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/symbol', expect.objectContaining({
      method: 'POST'
    }));
  });

  it('falls back to imageDataUrl if imageUrl not present', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        imageDataUrl: 'data:image/png;base64,abc123',
        engine: 'proxy-gemini'
      }),
    });

    const result = await generateSymbol('test prompt');

    expect(result.imageUrl).toBe('data:image/png;base64,abc123');
  });

  it('throws SymbolGenerationError on server error', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: { code: 'GENERATION_FAILED', message: 'No image data generated' },
        request_id: 'req-456'
      }),
    });

    try {
      await generateSymbol('test prompt');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SymbolGenerationError);
      if (error instanceof SymbolGenerationError) {
        expect(error.code).toBe('GENERATION_FAILED');
        expect(error.requestId).toBe('req-456');
      }
    }
  });

  it('throws SymbolGenerationError on network error', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network failed'));

    try {
      await generateSymbol('test prompt');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SymbolGenerationError);
      if (error instanceof SymbolGenerationError) {
        expect(error.code).toBe('NETWORK_ERROR');
      }
    }
  });

  it('throws SymbolGenerationError when response missing image data', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        engine: 'proxy-gemini',
        request_id: 'req-789'
      }),
    });

    try {
      await generateSymbol('test prompt');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SymbolGenerationError);
      if (error instanceof SymbolGenerationError) {
        expect(error.code).toBe('NO_IMAGE_DATA');
      }
    }
  });
});
