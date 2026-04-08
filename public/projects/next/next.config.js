const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    webpackBuildWorker: false,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      const emptyModule = path.resolve(__dirname, 'empty-module.js');

      // webpack 5 handles node: prefixed built-ins before NormalModuleReplacementPlugin
      // fires, so we must use resolve.alias with an actual path (not false).
      const builtins = [
        'assert', 'async_hooks', 'buffer', 'child_process', 'cluster',
        'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2',
        'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
        'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
        'string_decoder', 'timers', 'tls', 'trace_events', 'tty', 'url',
        'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
      ];

      for (const name of builtins) {
        config.resolve.alias[`node:${name}`] = emptyModule;
      }
    }
    return config;
  },
};
