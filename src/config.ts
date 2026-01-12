// Configuration for the application

// Feature Flags
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false'; // Default to true if not explicitly false
export const FORCE_HAPPY_PATH = true; // Ensures flows don't crash and always provide a next step

// Application Constants
export const APP_VERSION = '1.0.0-demo';

// BaziEngine Remote (Fly.io) - BASE URL only, no trailing slash
export const BAZI_ENGINE_BASE_URL = import.meta.env.VITE_BAZI_ENGINE_URL || 'https://baziengine-v2.fly.dev';

// Derived endpoints (constructed from base - prevents double /api/ paths)
export const REMOTE_SYMBOL_ENDPOINT = `${BAZI_ENGINE_BASE_URL}/api/symbol`;
export const REMOTE_ANALYSIS_ENDPOINT = `${BAZI_ENGINE_BASE_URL}/api/analysis`;
export const REMOTE_TRANSITS_ENDPOINT = `${BAZI_ENGINE_BASE_URL}/api/transits`;

// Local proxy (for Gemini via Express backend)
export const LOCAL_PROXY_URL = '/api/symbol';

// Legacy export for backwards compatibility (deprecated - use REMOTE_SYMBOL_ENDPOINT)
export const REMOTE_ENGINE_URL = BAZI_ENGINE_BASE_URL;
