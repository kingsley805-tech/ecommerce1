import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminDist = path.join(root, 'apps', 'admin', 'dist');
const storefrontDist = path.join(root, 'apps', 'storefront', 'dist');
const adminTarget = path.join(storefrontDist, 'admin');

await rm(adminTarget, { recursive: true, force: true });
await mkdir(adminTarget, { recursive: true });
await cp(adminDist, adminTarget, { recursive: true });
console.log(`Merged admin build into ${adminTarget}`);
