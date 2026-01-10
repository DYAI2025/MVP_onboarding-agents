import { createClient } from '@supabase/supabase-js';
import { FusionResult, BirthData } from '../types';

// These should be in .env, but for the MVP prototype we'll check if they exist
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing! DB features will be disabled.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Ensures the user is authenticated (anonymously if needed).
 */
export const ensureAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        return data.user?.id;
    }
    return session.user.id;
};

/**
 * Saves the calculation result to the database.
 * Maps the frontend FusionResult to the `astro_profiles` table schema.
 */
export const saveReading = async (birthData: BirthData, result: FusionResult) => {
    try {
        const userId = await ensureAuth();
        if (!userId) throw new Error("Authentication failed");

        // 1. Upsert Profile (if needed)
        // We assume the auth trigger handles profile creation, but we can update locale/tz
        await supabase.from('profiles').upsert({
            id: userId,
            timezone: 'Europe/Berlin', 
            updated_at: new Date().toISOString()
        });

        // 2. Save Birth Data
        const { error: birthError } = await supabase.from('birth_data').upsert({
            user_id: userId,
            // parsing "YYYY-MM-DD" and "HH:MM" to generic ISO string if needed, 
            // but the table expects timestamptz.
            // birthData.date is YYYY-MM-DD, birthData.time is HH:MM
            birth_utc: new Date(`${birthData.date}T${birthData.time}:00`).toISOString(), 
            place_label: birthData.location,
            updated_at: new Date().toISOString()
        });

        if (birthError) console.error("Error saving birth data:", birthError);

        // 3. Save Astro Profile (The Analysis)
        const { error: astroError } = await supabase.from('astro_profiles').upsert({
            user_id: userId,
            sun_sign: result.western.sunSign,
            moon_sign: result.western.moonSign,
            asc_sign: result.western.ascendant,
            astro_json: result, // Save the full JSON for the agent to read later
            astro_computed_at: new Date().toISOString()
        });

        if (astroError) console.error("Error saving astro profile:", astroError);

        return userId;

    } catch (e) {
        console.error("Database Save Failed:", e);
        return null;
    }
};
