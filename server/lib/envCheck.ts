import dotenv from 'dotenv';
import path from 'path';

// Load .env if not already loaded (though server.ts usually does this)
dotenv.config({ path: path.join(process.cwd(), '.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Required in all environments
const ALWAYS_REQUIRED = [
  'SESSION_SECRET',
  'GEMINI_API_KEY',
];

// Required only in production
const PRODUCTION_REQUIRED = [
  'REDIS_URL',
  'ELEVENLABS_TOOL_SECRET',
  'ELEVENLABS_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const REQUIRED_VARS = [
  ...ALWAYS_REQUIRED,
  ...(isProduction ? PRODUCTION_REQUIRED : [])
];

const OPTIONAL_VARS = [
  'VITE_SUPABASE_URL', // Used by frontend
  'VITE_SUPABASE_ANON_KEY', // Used by frontend
  'VITE_ELEVENLABS_AGENT_ID_LEVI',
  'VITE_ELEVENLABS_AGENT_ID_VICTORIA',
  'ELEVENLABS_API_KEY',
  'BAZI_ENGINE_URL',
  'VITE_DEMO_MODE',
  'VITE_GOOGLE_MAPS_API_KEY',
  ...(!isProduction ? PRODUCTION_REQUIRED : []) // Optional in dev
];

export function validateEnv() {
  const missing = [];
  const invalid = [];

  for (const key of REQUIRED_VARS) {
    const val = process.env[key];
    if (!val) {
      missing.push(key);
      continue;
    }
    if (val.includes('replace-with') || val.includes('placeholder')) {
      invalid.push(key);
    }
  }

  if (missing.length > 0) {
     const msg = `CRITICAL: Missing required environment variables: ${missing.join(', ')}`;
     console.error(msg);
     // In production, we might want to exit. In dev, maybe just warn?
     // Plan says: "Application refuses to start".
     throw new Error(msg);
  }

  if (invalid.length > 0) {
      const msg = `CRITICAL: Invalid (placeholder) environment variables: ${invalid.join(', ')}`;
      console.error(msg);
      throw new Error(msg);
  }

  // Check agent IDs specifically if we want to valid them
  // (Optional logic as per current app state)

  console.log('[EnvCheck] Environment validation passed.');
}
