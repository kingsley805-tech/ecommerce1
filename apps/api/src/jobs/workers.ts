import { Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { sendEmail } from '../integrations/email';
import { frontendUrl } from '../lib/notifications';

function workerConnection() {
  return { host: env.REDIS_HOST, port: env.REDIS_PORT, maxRetriesPerRequest: null };
}

export function startWorkers() {
  const emailWorker = new Worker(
    'email',
    async (job) => {
      const msg = job.data as { to: string; subject: string; text: string; html: string };
      const { delivered, id } = await sendEmail(msg);
      if (!delivered) throw new Error('email delivery failed');
      return { messageId: id };
    },
    { connection: workerConnection(), concurrency: 5 },
  );

  const inventoryWorker = new Worker(
    'inventory',
    async (job) => {
      if (job.name === 'low-stock-check') {
        await runLowStockCheck(job.data as { productId: string; variantId?: string | null });
      }
    },
    { connection: workerConnection(), concurrency: 2 },
  );

  emailWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'email job failed');
  });
  inventoryWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'inventory job failed');
  });

  return { emailWorker, inventoryWorker };
}

async function runLowStockCheck(data: { productId: string; variantId?: string | null }) {
  const level = await prisma.inventoryLevel.findFirst({
    where: {
      productId: data.productId,
      variantId: data.variantId ?? null,
    },
    include: { product: { select: { name: true } } },
  });
  if (!level) return;
  const threshold = level.lowStockThreshold ?? 5;
  const available = level.physicalStock - level.reservedStock;
  if (available <= threshold) {
    const admins = await prisma.userRole.findMany({
      where: {
        role: { key: { in: ['SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER'] as never } },
      },
      select: { userId: true },
    });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          channel: 'IN_APP',
          type: 'LOW_STOCK',
          subject: 'Low stock alert',
          body: `"${level.product.name}" has only ${available} left in stock.`,
          data: { productId: data.productId, available },
        },
      });
    }
  }
}

export function orderConfirmUrl(orderNumber: string): string {
  return frontendUrl(`/account/orders/${orderNumber}`);
}
