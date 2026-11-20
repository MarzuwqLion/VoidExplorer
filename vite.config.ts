import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { port: 5199, strictPort: true },
  preview: { port: 5198, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120000,
    pool: 'threads',
  },
});
