# ============ Builder ============
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/ packages/
COPY apps/api/package.json apps/api/package.json
COPY prisma/ prisma/

RUN npm install --workspace apps/api

COPY tsconfig.base.json ./
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src

RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run build --workspace apps/api

# ============ Runtime ============
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules
COPY --from=builder /app/apps/api/src apps/api/src
COPY --from=builder /app/apps/api/tsconfig.json apps/api/tsconfig.json
COPY prisma/ prisma/
COPY apps/api/package.json apps/api/package.json

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && npx tsx apps/api/src/index.ts"]
