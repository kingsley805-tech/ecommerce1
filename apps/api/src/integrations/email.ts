import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  bcc?: string[];
  replyTo?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.warn('SMTP not configured — emails will be logged, not sent.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  } as nodemailer.TransportOptions);
  return transporter;
}

export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean; id?: string }> {
  const t = getTransporter();
  if (!t) {
    logger.info({ to: message.to, subject: message.subject }, 'email[skipped]');
    return { delivered: false };
  }
  try {
    const info = await t.sendMail({
      from: env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      bcc: message.bcc,
      replyTo: message.replyTo,
    });
    logger.info({ to: message.to, messageId: info.messageId }, 'email[sent]');
    return { delivered: true, id: info.messageId };
  } catch (err) {
    logger.error({ err, to: message.to }, 'email[failed]');
    return { delivered: false };
  }
}

export function wrapText(text: string, storeName = 'Modern Commerce'): string {
  return `${text}\n\n— ${storeName}\n`;
}
