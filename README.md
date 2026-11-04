# Modern Commerce

A production-ready, full-stack e-commerce platform with a premium customer storefront and a complete administrative dashboard.

## Architecture

Monorepo (npm workspaces):

| Package | Description | Default port |
| --- | --- | --- |
| `apps/storefront` | Customer-facing React storefront | 5173 |
| `apps/admin` | Administrative React dashboard | 5174 |
| `apps/api` | Node.js + Express REST API | 4000 |
| `packages/shared-types` | Shared TS types across apps | — |
| `packages/validation` | Shared Zod validation schemas | — |
| `packages/shared-config` | Shared design/currency config | — |

**Stack:** React + TypeScript + Vite + Tailwind CSS + shadcn-style UI + TanStack Query + React Hook Form + Zod on the frontends. Express + Prisma + PostgreSQL + Redis (BullMQ, rate limiting, caching) on the backend.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (local, or via Docker Compose)
- Redis 7+ (local, or via Docker Compose)
- Optional: Docker + Docker Compose

## Quick start (local dev)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate with `openssl rand -hex 64`
- `REDIS_URL` — your Redis connection string

Optional integrations (leave blank to disable): `STRIPE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`, SMTP settings, S3/MinIO storage.

### 3. Database

```bash
# Generate the Prisma client
npx prisma generate

# Create the schema
npx prisma migrate dev --name init

# (optional) Seed roles, permissions, admin, catalog, content, shipping
npx prisma db seed
```

The seed creates a super admin using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (default `admin@example.com` / `ChangeMe!123`).

### 4. Run

```bash
npm run dev
```

- Storefront: http://localhost:5173
- Admin: http://localhost:5174
- API: http://localhost:4000 (health check: `GET /healthz`)

## Docker Compose (full stack)

```bash
cp .env.example .env
# fill in secret env vars, then:
docker compose up --build
```

This runs PostgreSQL, Redis, MinIO, the API, storefront, and admin. Apply migrations and seed once:

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API + storefront + admin in dev mode |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run test` | Run tests in all workspaces |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create a development migration |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Run the database seed |
| `npm run db:studio` | Open Prisma Studio |
| `npm run backup:db` | `pg_dump` backup with rotation |

## Testing

Backend (Vitest):

```bash
npm run test --workspace apps/api
```

Covers coupon eligibility rules, shipping/tax calculations, and oversell prevention (`assertStock`).

Frontend (Vitest + Testing Library):

```bash
npm run test --workspace apps/storefront
npm run test --workspace apps/admin
```

## Environment variables

See `.env.example` for the full documented list. Key groups:

- **Core:** `NODE_ENV`, `PORT`, `API_URL`, `STOREFRONT_URL`, `ADMIN_URL`
- **Database:** `DATABASE_URL`, `POSTGRES_USER/PASSWORD/DB`
- **Redis:** `REDIS_URL`
- **Auth:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_COOKIE_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `COOKIE_SECURE`
- **Storage:** `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`
- **Email:** `SMTP_HOST/PORT/USER/PASS/FROM/SECURE`
- **Payments:** `STRIPE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY` (and webhook secrets), `PAYMENT_METHODS`, `DEFAULT_CURRENCY`
- **Seeder:** `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_DEV_DATA`
- **Ops:** `LOG_LEVEL`, `MAINTENANCE_MODE`

> Never commit real credentials. Only `.env.example` is committed.

## Deployment (VPS / cloud)

1. **Build** the workspace: `npm run build`.
2. **Set up PostgreSQL + Redis** on the host (or use managed services).
3. **Run migrations**: `npx prisma migrate deploy`; **seed** if needed.
4. **API**: start with `node apps/api/dist/index.js` behind a reverse proxy (nginx/Caddy) terminating HTTPS.
5. **Frontends**: serve `apps/storefront/dist` and `apps/admin/dist` as static sites (or via the provided nginx configs), proxying `/api` to the API.
6. **Environment**: set `COOKIE_SECURE=true` and real secret keys; point `S3_PUBLIC_URL` and SMTP at production services.
7. **Backups**: schedule `npm run backup:db` (e.g. cron) to create rotated `pg_dump` archives.
8. **CI/CD**: `.github/workflows/ci.yml` runs type-check, tests, migration, seed, and builds on every push.

### Security notes for production

- Use HTTPS everywhere; set `COOKIE_SECURE=true`.
- Set strong `JWT_*` secrets and restrict CORS origins.
- Only configure payment gateways you have merchant credentials for — unconfigured gateways are rejected, never simulated.
- Keep `DATABASE_URL` credentials least-privilege (separate read-only user for reporting if needed).
- Review `npm audit` output in CI before shipping.

## Project structure

```text
apps/
  storefront/   # customer UI
  admin/         # admin UI
  api/           # Express API (modules, middleware, jobs, integrations)
packages/
  shared-types/
  validation/
  shared-config/
prisma/
  schema.prisma
  migrations/
  seed.ts
scripts/
  backup.mjs
docker-compose.yml
.github/workflows/ci.yml
```
