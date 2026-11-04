import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/modern_commerce_test?schema=public',
      JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef0123456789abcdef',
      JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef0123456789abcdef',
      JWT_COOKIE_SECRET: 'test-cookie-secret',
      REDIS_URL: 'redis://localhost:6379',
    },
  },
});
