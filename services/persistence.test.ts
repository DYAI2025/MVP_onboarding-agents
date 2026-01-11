
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveState, loadState, clearState } from './persistence';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

describe('Persistence Service', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('should save and load state', () => {
        const mockState = {
            analysisResult: { prompt: 'foo' } as any,
            generatedImage: 'img_url',
            selectedAgent: 'agent_1',
            timestamp: 12345
        };

        saveState(mockState);
        const loaded = loadState();

        expect(loaded?.generatedImage).toBe('img_url');
        expect(loaded?.selectedAgent).toBe('agent_1');
    });

    it('should clear state', () => {
        saveState({ generatedImage: 'test' });
        expect(loadState()).not.toBeNull();

        clearState();
        expect(loadState()).toBeNull();
    });

    it('should merge updates', () => {
        saveState({ generatedImage: 'img1' });
        saveState({ selectedAgent: 'agent1' }); // Should not overwrite generatedImage if implementation merges properly?
        // Actually my implementation uses `loadState() || default` then merges.

        const loaded = loadState();
        expect(loaded?.generatedImage).toBe('img1');
        expect(loaded?.selectedAgent).toBe('agent1');
    });
});
