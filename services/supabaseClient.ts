
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('replace-with');

if (!isConfigured) {
    throw new Error(
        'CRITICAL: Supabase URL or Anon Key is missing or invalid. \n' +
        'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.\n' +
        'The application cannot function without a database connection.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
