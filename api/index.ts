import { createApp } from '../apps/api/src/app';

export const config = {
  runtime: 'nodejs20.x',
};

const app = createApp();

export default app;
