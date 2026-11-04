import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from '../apps/api/src/config/env';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../.env') });
console.log('ENV_OK', env.DATABASE_URL.slice(0, 30), env.JWT_ACCESS_SECRET.length, env.JWT_COOKIE_SECRET.length);
