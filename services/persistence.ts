
import { FusionResult } from '../types';

const STORAGE_KEY = 'astro_journey_state_v1';

export interface JourneyState {
    analysisResult: FusionResult | null;
    generatedImage: string | null;
    selectedAgent: string | null;
    lastView?: string;
    timestamp: number;
}

export const loadState = (): JourneyState | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as JourneyState;
    } catch (error) {
        console.error("Failed to load state", error);
        return null;
    }
};

export const saveState = (state: Partial<JourneyState>) => {
    try {
        const current = loadState() || {
            analysisResult: null,
            generatedImage: null,
            selectedAgent: null,
            timestamp: Date.now()
        };

        // Merge updates
        const updated = { ...current, ...state, timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error("Failed to save state", error);
    }
};

export const clearState = () => {
    localStorage.removeItem(STORAGE_KEY);
};
