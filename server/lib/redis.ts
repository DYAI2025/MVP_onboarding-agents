import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('[Redis] Initializing client...');

// Create Redis client with robust retry strategy
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error starts with "READONLY"
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (err) => {
  // Log error but don't crash process (soft-fail for now, though functionality will be degraded)
  console.error('[Redis] Connection error:', err.message);
});

redis.on('ready', () => {
  console.log('[Redis] Client is ready');
});
