import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
const isLocalDev = !REDIS_URL || REDIS_URL.includes('localhost');

console.log('[Redis] Initializing client...');

// Create Redis client or mock for local development
export const redis = isLocalDev
  ? createMockRedis()
  : new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err: Error) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error starts with "READONLY"
          return true;
        }
        return false;
      },
    });

if (!isLocalDev) {
  redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  redis.on('error', (err: Error) => {
    // Log error but don't crash process (soft-fail for now, though functionality will be degraded)
    console.error('[Redis] Connection error:', err.message);
  });

  redis.on('ready', () => {
    console.log('[Redis] Client is ready');
  });
} else {
  console.warn('[Redis] Running in local dev mode - Redis features disabled');
}

// Mock Redis for local development without Redis
function createMockRedis(): any {
  const store = new Map<string, { value: any, exp?: number }>();

  return {
    // Core Redis commands used by rate-limit-redis
    call: async (command: string, ...args: any[]) => {
      const cmd = command.toLowerCase();
      if (cmd === 'get') {
        const entry = store.get(args[0]);
        return entry ? entry.value : null;
      }
      if (cmd === 'incr') {
        const key = args[0];
        const entry = store.get(key);
        const newVal = (entry?.value || 0) + 1;
        store.set(key, { value: newVal });
        return newVal;
      }
      if (cmd === 'expire') {
        const key = args[0];
        const entry = store.get(key);
        if (entry) {
          entry.exp = Date.now() + (args[1] * 1000);
        }
        return 1;
      }
      if (cmd === 'eval' || cmd === 'evalsha') {
        // Mock EVAL for rate limiter script - return [0, ttl]
        return [0, -1];
      }
      return null;
    },
    on: () => {},
    get: async (key: string) => store.get(key)?.value || null,
    set: async (key: string, value: any) => { store.set(key, { value }); return 'OK'; },
    del: async (key: string) => { store.delete(key); return 1; },
    exists: async (key: string) => store.has(key) ? 1 : 0,
    expire: async (key: string, seconds: number) => {
      const entry = store.get(key);
      if (entry) {
        entry.exp = Date.now() + (seconds * 1000);
        return 1;
      }
      return 0;
    },
    ttl: async (key: string) => {
      const entry = store.get(key);
      if (!entry) return -2;
      if (!entry.exp) return -1;
      return Math.max(0, Math.floor((entry.exp - Date.now()) / 1000));
    },
    keys: async () => Array.from(store.keys()),
    ping: async () => 'PONG',
    incr: async (key: string) => {
      const entry = store.get(key);
      const newVal = (entry?.value || 0) + 1;
      store.set(key, { value: newVal });
      return newVal;
    },
    quit: async () => { store.clear(); return 'OK'; },
  };
}
