import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // E2E runs disable HMR so editing files during a long test run cannot reload the page.
  server: { port: 5199, strictPort: true, hmr: process.env.E2E ? false : undefined, watch: process.env.E2E ? null : undefined },
  preview: { port: 5198, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120000,
    pool: 'threads',
  },
});
