import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const result = spawnSync('npm', ['run', ...args], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
