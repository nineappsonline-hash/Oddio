import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@ai-music/contracts': fileURLToPath(
        new URL('./packages/contracts/src/index.ts', import.meta.url),
      ),
      '@ai-music/db': fileURLToPath(
        new URL('./packages/db/src/index.ts', import.meta.url),
      ),
      '@ai-music/audio': fileURLToPath(
        new URL('./packages/audio/src/index.ts', import.meta.url),
      ),
      '@ai-music/ui': fileURLToPath(
        new URL('./packages/ui/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/web/src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
  },
});
