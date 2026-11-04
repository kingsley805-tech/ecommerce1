FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/ packages/
COPY apps/storefront/package.json apps/storefront/package.json

RUN npm install --workspace apps/storefront

COPY tsconfig.base.json ./
COPY apps/storefront/ apps/storefront/

RUN npm run build --workspace apps/storefront

FROM nginx:alpine
COPY apps/storefront/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/storefront/dist /usr/share/nginx/html
EXPOSE 80
