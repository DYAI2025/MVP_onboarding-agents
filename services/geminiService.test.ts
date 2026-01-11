
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { generateSymbol } from './geminiService';

global.fetch = vi.fn();

// Mock config to control DEMO_MODE dynamically
vi.mock('../src/config', () => ({
    DEMO_MODE: false, // Default for these tests
    REMOTE_ENGINE_URL: 'https://test',
    LOCAL_PROXY_URL: '/test'
}));

describe('geminiService Fallback Logic', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should use Remote Engine if available', async () => {
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ imageUrl: 'https://remote.com/img.png' }),
        });

        const result = await generateSymbol('prompt');
        expect(result.engineUsed).toBe('remote');
        expect(result.imageUrl).toBe('https://remote.com/img.png');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should fallback to Proxy if Remote fails', async () => {
        // First call fails (Remote)
        (global.fetch as Mock)
            .mockResolvedValueOnce({
                ok: false,
                status: 500
            })
            // Second call succeeds (Proxy)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ imageDataUrl: 'data:image/png;base64,foo' })
            });

        const result = await generateSymbol('prompt');
        expect(result.engineUsed).toBe('proxy');
        expect(result.imageUrl).toContain('data:image/png');
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should fallback to Local SVG if both networks fail (Robust Fallback)', async () => {
        // Remote fails
        (global.fetch as Mock).mockRejectedValueOnce(new Error('Network Error'));
        // Proxy fails
        (global.fetch as Mock).mockRejectedValueOnce(new Error('Proxy Error'));

        const result = await generateSymbol('prompt');
        expect(result.engineUsed).toBe('demo_local_svg'); // Expect local SVG now instead of picsum
        expect(result.imageUrl).toContain('data:image/svg+xml');
    });
});
