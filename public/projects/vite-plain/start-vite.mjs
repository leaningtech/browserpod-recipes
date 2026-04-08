import { createServer } from 'vite';

const server = await createServer({
  root: process.cwd(),
  configFile: false,
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

await server.listen();
server.printUrls();
