import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Les tests d'intégration MySQL appliquent toutes les migrations : on laisse plus de temps.
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
