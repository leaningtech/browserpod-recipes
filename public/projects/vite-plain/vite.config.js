import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: false,
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: null,
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
});
