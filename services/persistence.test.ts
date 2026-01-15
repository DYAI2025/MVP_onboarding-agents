
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

/*
describe('Persistence Service', () => {
    // Tests temporarily disabled during Supabase migration.
    // TODO: Rewrite tests to mock supabaseClient instead of localStorage.
});
*/
