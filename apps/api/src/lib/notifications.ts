import { prisma } from './prisma';
import { sendEmail } from '../integrations/email';
import { env } from '../config/env';
import type { NotificationChannel } from '@commerce/shared-types';

export interface NotificationInput {
  userId?: string;
  email?: string;
  channel: NotificationChannel;
  type: string;
  subject?: string;
  body?: string;
  html?: string;
  data?: Record<string, unknown>;
}

/** Send a notification. Emails are enqueued via BullMQ; in-app rows are always written. */
export async function notify(input: NotificationInput): Promise<void> {
  const record = await prisma.notification.create({
    data: {
      userId: input.userId,
      channel: input.channel,
      type: input.type,
      subject: input.subject,
      body: input.body,
      data: input.data as object | undefined,
    },
  });

  if (input.channel === 'EMAIL' && input.email) {
    const queued = await tryEnqueueEmail({
      to: input.email,
      subject: input.subject ?? input.type,
      text: input.body ?? '',
      html: input.html ?? '',
    });
    await prisma.notification.update({
      where: { id: record.id },
      data: queued ? { sentAt: new Date() } : { error: 'email queue unavailable' },
    });
  }
  return undefined;
}

interface EmailEnvelope {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function tryEnqueueEmail(msg: EmailEnvelope): Promise<boolean> {
  try {
    const { emailQueue } = await import('../jobs/queues');
    await emailQueue.add('send', msg, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    });
    return true;
  } catch {
    // Redis unavailable — fall back to direct send (dev/test).
    const { delivered } = await sendEmail(msg);
    return delivered;
  }
}

export function storeUrl(path: string): string {
  return env.API_URL + path;
}

export function frontendUrl(path: string): string {
  return env.STOREFRONT_URL + path;
}
