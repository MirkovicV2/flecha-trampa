import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: { entries: ['index.html'] },
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/.tools/**', '**/.artifacts/**', '**/android/**', '**/ios/**'] },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
