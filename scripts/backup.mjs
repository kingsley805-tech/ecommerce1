#!/usr/bin/env node
/**
 * PostgreSQL backup script.
 *
 * Reads DATABASE_URL from .env (or environment) and runs pg_dump to a file,
 * rotating old backups. Usage: npm run backup:db
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[backup] DATABASE_URL is not set');
  process.exit(1);
}

const m = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!m) {
  console.error('[backup] Could not parse DATABASE_URL');
  process.exit(1);
}
const [, user, password, host, port, db] = m;

const backupsDir = join(process.cwd(), 'backups');
mkdirSync(backupsDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = join(backupsDir, `${db}_${stamp}.sql`);

const res = spawnSync('pg_dump', ['-h', host, '-p', port, '-U', user, '-d', db, '-F', 'c', '-f', file], {
  env: { ...process.env, PGPASSWORD: password },
  stdio: 'inherit',
});

if (res.status !== 0) {
  console.error('[backup] pg_dump failed');
  process.exit(1);
}
console.log(`[backup] written ${file}`);

// Keep last 14 backups
const keep = 14;
const existing = readdirSync(backupsDir).filter((f) => f.startsWith(`${db}_`) && f.endsWith('.sql')).sort();
while (existing.length > keep) {
  const oldest = existing.shift();
  const p = join(backupsDir, oldest);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log(`[backup] removed ${oldest}`);
  }
}
