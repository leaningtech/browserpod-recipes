import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

console.log('[start-vite] creating server...');
const server = await createServer({
  root: process.cwd(),
  configFile: false,
  esbuild: false,
  plugins: [svelte()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: null,
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
    exclude: ['svelte', 'svelte/internal', 'svelte/internal/client', 'svelte/internal/server', 'svelte/store', 'svelte/motion', 'svelte/transition', 'svelte/animate', 'svelte/easing', 'svelte/legacy'],
  },
});

console.log('[start-vite] listening...');
await server.listen();
server.printUrls();
