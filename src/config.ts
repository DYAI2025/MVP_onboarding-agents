// Configuration for the application

// Feature Flags - Production-first defaults
// Set VITE_DEMO_MODE=true in .env for local development with mocked data
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
// Set VITE_FORCE_HAPPY_PATH=true in .env to suppress errors during development
export const FORCE_HAPPY_PATH = import.meta.env.VITE_FORCE_HAPPY_PATH === 'true';

// Application Constants
export const APP_VERSION = '1.0.0-demo';

// BaziEngine Remote - BASE URL only, no trailing slash
// In production, we default to empty string which result in relative paths (same-origin)
// In development, we fallback to the known remote engine for easier testing
const DEFAULT_REMOTE = import.meta.env.DEV ? 'https://baziengine-v2.fly.dev' : '';
export const BAZI_ENGINE_BASE_URL = import.meta.env.VITE_BAZI_ENGINE_URL || DEFAULT_REMOTE;

// Derived endpoints (constructed from base - prevents double /api/ paths)
export const REMOTE_SYMBOL_ENDPOINT = `${BAZI_ENGINE_BASE_URL}/api/symbol`;
export const REMOTE_ANALYSIS_ENDPOINT = `${BAZI_ENGINE_BASE_URL}/api/analysis`;
export const REMOTE_TRANSITS_ENDPOINT = `${BAZI_ENGINE_BASE_URL}/api/transits`;

// Local proxy (for Gemini via Express backend)
export const LOCAL_PROXY_URL = '/api/symbol';

// Legacy export for backwards compatibility (deprecated - use REMOTE_SYMBOL_ENDPOINT)
export const REMOTE_ENGINE_URL = BAZI_ENGINE_BASE_URL;
