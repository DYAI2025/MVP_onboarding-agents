import { FusionResult } from '../types';
import { supabase } from './supabaseClient';

export interface JourneyState {
    analysisResult: FusionResult | null;
    generatedImage: string | null;
    selectedAgent: string | null;
    lastView?: string;
    timestamp: number;
}

export const loadState = async (): Promise<JourneyState | null> => {
    // Prevent crashes if Supabase is not configured
    if (!supabase.auth || !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('replace-with')) {
        console.warn('Supabase not configured, skipping cloud state load.');
        return null;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();

        // Auto-login anchor (MVP shortcut: anonymous login if missing)
        let currentUser = user;
        if (!currentUser) {
            const { data: anonData, error } = await supabase.auth.signInAnonymously();
            if (error) {
                console.warn('Supabase anon auth failed:', error);
                return null;
            }
            currentUser = anonData.user;
        }

        if (!currentUser) return null;

        // 1. Fetch Profile (for UI state)
        const { data: profile } = await supabase
            .from('profiles')
            .select('ui_state')
            .eq('id', currentUser.id)
            .single();

        // 2. Fetch Latest Chart (for Data)
        const { data: charts } = await supabase
            .from('charts')
            .select('analysis_json')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1);

        const analysisResult = charts && charts.length > 0 ? (charts[0].analysis_json as FusionResult) : null;

        // 3. Reconstruct State
        // If we have a profile state, use it. Otherwise defaults.
        const uiState = profile?.ui_state || {};

        if (!analysisResult && !uiState.generatedImage) return null;

        return {
            analysisResult: analysisResult,
            generatedImage: uiState.generatedImage || null,
            selectedAgent: uiState.selectedAgent || null,
            lastView: uiState.lastView || 'dashboard',
            timestamp: Date.now()
        };

    } catch (error) {
        console.error("Failed to load state from Supabase", error);
        return null;
    }
};

export const saveState = async (state: Partial<JourneyState>) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Can't save without user

        const updates: Promise<any>[] = [];

        // A. Save Analysis (Immutable-ish, only if present)
        if (state.analysisResult) {
            // We rely on the Gateway to save the chart on creation (/api/analysis).
            // So we SKIP saving analysisResult here.
        }

        // B. Save UI State (Profile)
        const uiState = {
            generatedImage: state.generatedImage,
            selectedAgent: state.selectedAgent,
            lastView: state.lastView,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                ui_state: uiState
            });

        if (error) {
            console.error("Supabase profile save error:", error);
        }

    } catch (error) {
        console.error("Failed to save state to Supabase", error);
    }
};

export const clearState = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("SignOut failed", error);
};
