import { PrismaClient } from '@prisma/client';
import { isTest } from '../config/env';

export const prisma = new PrismaClient({
  log: isTest
    ? ['error']
    : [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }],
});

if (!isTest) {
  prisma.$on('query' as never, (e: unknown) => {
    const q = e as { query: string; duration: number };
    if (q.duration > 200) {
      // slow query log
      process.stdout.write(`[slow-query ${q.duration}ms] ${q.query}\n`);
    }
  });
}
