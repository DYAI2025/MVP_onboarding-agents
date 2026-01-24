import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import { redis } from './redis.js';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
const hasRedis = REDIS_URL && !REDIS_URL.includes('localhost');

// Reuse the existing Redis connection for the Queue (producer)
// Note: BullMQ will create its own connections for Workers
// Only create queue if we have a real Redis connection
export const reportQueue = hasRedis ? new Queue('report-generation', {
  connection: redis as any // Cast to any to avoid version mismatch between root ioredis and bullmq's ioredis
}) : null;

if (!hasRedis) {
  console.log('[Queue] Skipped - Redis not available');
}
