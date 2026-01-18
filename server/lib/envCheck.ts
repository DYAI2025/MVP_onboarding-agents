import dotenv from 'dotenv';
import path from 'path';

// Load .env if not already loaded (though server.ts usually does this)
dotenv.config({ path: path.join(process.cwd(), '.env') });

const REQUIRED_VARS = [
  'SESSION_SECRET',
  'ELEVENLABS_TOOL_SECRET',
  'ELEVENLABS_WEBHOOK_SECRET',
  'GEMINI_API_KEY',
  'REDIS_URL'
];

const OPTIONAL_VARS = [
    'VITE_SUPABASE_URL', // Used by frontend, but maybe server uses it too via client
    'VITE_SUPABASE_ANON_KEY'
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
