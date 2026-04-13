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

// BrowserPod's WebCrypto doesn't support AES key generation — stub it.
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
      return { type: 'secret', extractable, algorithm, usages: keyUsages, [STUB_MARKER]: true };
    }
  };

  _subtle.exportKey = async function (format, key) {
    if (key?.[STUB_MARKER]) return STUB_KEY_BYTES.buffer.slice(0, 32);
    return _exportKey(format, key);
  };
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
