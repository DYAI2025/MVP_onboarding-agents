import { Queue } from 'bullmq';
import dotenv from 'dotenv';
import { redis } from './redis';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Reuse the existing Redis connection for the Queue (producer)
// Note: BullMQ will create its own connections for Workers
export const reportQueue = new Queue('report-generation', {
  connection: redis as any // Cast to any to avoid version mismatch between root ioredis and bullmq's ioredis
});
