import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';

console.log('[start-vite] creating server...');
const server = await createServer({
  root: process.cwd(),
  configFile: false,
  esbuild: false,
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: null,
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
    exclude: ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared', '@vue/compiler-dom', '@vue/compiler-core'],
  },
});

console.log('[start-vite] listening...');
await server.listen();
server.printUrls();
