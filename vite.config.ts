import { defineConfig } from 'vite';

export default defineConfig({
  // base: '/', // set to your deployment path if hosting in a subdirectory
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Ensure a clean, small bundle
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
