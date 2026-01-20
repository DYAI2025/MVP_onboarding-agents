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
  const noop = async () => null;
  return {
    call: noop,
    on: () => {},
    get: noop,
    set: noop,
    del: noop,
    exists: noop,
    expire: noop,
    ttl: noop,
    keys: async () => [],
    ping: async () => 'PONG',
  };
}
