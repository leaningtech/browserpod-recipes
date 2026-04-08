import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

console.log('[start-vite] creating server...');
const server = await createServer({
  root: process.cwd(),
  configFile: false,
  esbuild: false,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: null,
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
    exclude: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
});

console.log('[start-vite] listening...');
await server.listen();
server.printUrls();
