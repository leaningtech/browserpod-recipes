process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.DO_NOT_TRACK = '1';

// Stub inspector — BrowserPod does not implement it
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Module = require('module');
const _load = Module._load.bind(Module);
Module._load = function (request, ...args) {
  if (request === 'inspector' || request === 'node:inspector') {
    return { open: () => {}, close: () => {}, url: () => undefined, Session: class {} };
  }
  return _load(request, ...args);
};

// BrowserPod's WebCrypto doesn't support AES key generation or export.
// Stub both so Next 14's cookie/session signing initializes without crashing.
const _subtle = globalThis.crypto?.subtle;
if (_subtle) {
  const _generateKey = _subtle.generateKey.bind(_subtle);
  const _exportKey = _subtle.exportKey.bind(_subtle);

  const STUB_KEY_BYTES = require('crypto').randomBytes(32);
  const STUB_MARKER = Symbol('stub-key');

  _subtle.generateKey = async function (algorithm, extractable, keyUsages) {
    try {
      return await _generateKey(algorithm, extractable, keyUsages);
    } catch {
      const stub = { type: 'secret', extractable, algorithm, usages: keyUsages, [STUB_MARKER]: true };
      return stub;
    }
  };

  _subtle.exportKey = async function (format, key) {
    if (key?.[STUB_MARKER]) {
      const buf = STUB_KEY_BYTES.buffer.slice(0, 32);
      return buf;
    }
    return _exportKey(format, key);
  };
}

// Scan files in the dev-overlay import chain for node: references and patch them.
// getErrorByType.js is what webpack reports, but the actual node: import could be
// in any file along the chain. Use require.resolve to get correct BrowserPod paths.
{
  const { readFileSync, writeFileSync } = await import('fs');

  const targets = [
    'next/dist/client/components/react-dev-overlay/internal/helpers/getErrorByType',
    'next/dist/client/components/react-dev-overlay/pages/client',
    'next/dist/client/components/react-dev-overlay/pages/hot-reloader-client',
    'next/dist/client/dev/hot-middleware-client',
    'next/dist/client/page-bootstrap',
  ];

  for (const mod of targets) {
    let filePath;
    try {
      filePath = require.resolve(mod);
    } catch {
      console.log('[start-next] cannot resolve', mod);
      continue;
    }

    const src = readFileSync(filePath, 'utf8');
    const hasNodePrefix = src.includes("'node:") || src.includes('"node:');

    if (hasNodePrefix) {
      // Patch both require() calls and ESM import statements
      let patched = src;
      // require('node:...')  →  ({})
      patched = patched.replace(/require\(["']node:[^"']+["']\)/g, '({})');
      // import X from 'node:...'  →  const X = {};
      patched = patched.replace(/import\s+(\w+)\s+from\s+["']node:[^"']+["']/g, 'const $1 = {}');
      // import { ... } from 'node:...'  →  const { ... } = {};
      patched = patched.replace(/import\s+(\{[^}]+\})\s+from\s+["']node:[^"']+["']/g, 'const $1 = {}');

      if (patched !== src) {
        writeFileSync(filePath, patched);
        console.log('[start-next] patched', mod);
      } else {
        // Has node: but regex didn't match — log the raw snippet to diagnose
        const idx = src.search(/'node:|"node:/);
        console.log('[start-next] unmatched node: in', mod, '—', JSON.stringify(src.slice(Math.max(0, idx - 40), idx + 80)));
      }
    } else {
      console.log('[start-next] clean:', mod.split('/').pop());
    }
  }
}

console.log('[start-next] importing next...');
const next = (await import('next')).default;

console.log('[start-next] creating app...');
const app = next({ dev: true, hostname: '0.0.0.0', port: 3000 });

console.log('[start-next] preparing...');
await app.prepare();
console.log('[start-next] prepared.');

const { createServer } = await import('http');
createServer(app.getRequestHandler()).listen(3000, '0.0.0.0', () => {
  console.log('[start-next] listening on port 3000');
});
