FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/ packages/
COPY apps/admin/package.json apps/admin/package.json

RUN npm install --workspace apps/admin

COPY tsconfig.base.json ./
COPY apps/admin/ apps/admin/

RUN npm run build --workspace apps/admin

FROM nginx:alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
