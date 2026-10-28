import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // En développement, les appels /api sont relayés vers le backend (même origine côté navigateur).
    proxy: { '/api': { target: 'http://localhost:4000' } },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
