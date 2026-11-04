import http from 'node:http';

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { connectRedis, disconnectRedis } from './lib/redis';
import { prisma } from './lib/prisma';
import { startWorkers } from './jobs/workers';
import { closeQueues } from './jobs/queues';

async function main() {
  await connectRedis();
  logger.info('Redis connected');

  const app = createApp();
  const server = http.createServer(app);

  const workers = startWorkers();

  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    workers.emailWorker.close();
    workers.inventoryWorker.close();
    await closeQueues();
    await disconnectRedis();
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API listening');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
