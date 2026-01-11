
// Configuration for the application

// Feature Flags
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false'; // Default to true if not explicitly false

// Application Constants
export const APP_VERSION = '1.0.0-demo';
export const REMOTE_ENGINE_URL = 'https://baziengine-v2.fly.dev';
export const LOCAL_PROXY_URL = '/api/symbol';

// Fallback Configuration
export const FORCE_HAPPY_PATH = true; // Ensures flows don't crash and always provide a next step
