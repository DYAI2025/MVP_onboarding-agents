
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('replace-with');

if (!isConfigured) {
    console.warn('Supabase URL or Anon Key missing. Persistence will fail.');
}

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            signInAnonymously: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
            signOut: async () => ({ error: null })
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: null }),
                    order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) })
                })
            }),
            upsert: () => Promise.resolve({ error: null })
        })
    } as any;
