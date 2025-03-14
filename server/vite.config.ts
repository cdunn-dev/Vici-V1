import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/services/strava.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/services/!(strava.test.ts)'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../client/src'),
      '@shared': path.resolve(__dirname, '../shared'),
    }
  }
});