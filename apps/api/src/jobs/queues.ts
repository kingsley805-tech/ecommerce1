import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';

let connection: Redis | null = null;

function getConnection(): Redis {
  if (!connection) {
    connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export const emailQueue = new Queue('email', { connection: getConnection() });
export const orderQueue = new Queue('order', { connection: getConnection() });
export const inventoryQueue = new Queue('inventory', { connection: getConnection() });
export const reportQueue = new Queue('report', { connection: getConnection() });

export async function closeQueues() {
  await Promise.all([emailQueue.close(), orderQueue.close(), inventoryQueue.close(), reportQueue.close()]);
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
