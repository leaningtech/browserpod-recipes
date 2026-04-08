# Next.js Recipe — Debug Log

## Goal
Get Next.js running inside BrowserPod: install completes, dev server starts, portal opens, page loads.

---

## BrowserPod Constraints Relevant to Next.js

- `--ignore-scripts` required on all installs to prevent `SYS_GETSOCKOPT` hang from native binary postinstall scripts
- `handleExecve` in the BrowserPod service worker is unreliable — use `pod.run('node', [...])` directly
- `BrowserPodProcess.then()` returns `undefined` — cannot chain `.catch()`
- The inspector API (`node:inspector`) is not implemented
- Web Crypto `SecretKeyGenJob` is not implemented (`crypto.subtle.generateKey` for AES keys fails)
- BrowserPod CAN make outbound network requests (e.g. to npm registry)

---

## Attempts in Order

### 1. Initial setup — silent hang after command echo
**Symptom:** `npm run dev` echoed in terminal but portal never appeared.  
**Cause:** `npm run dev` spawns child processes via `handleExecve` in the BrowserPod service worker, which is unreliable.  
**Fix:** Added `devCmd: 'node'` and `devArgs: ['node_modules/next/dist/bin/next', 'dev', '-H', '0.0.0.0', '-p', '3000']` to bypass npm entirely.  
**Result:** Still hangs silently.

### 2. `--no-turbopack` flag
**Symptom:** Silent hang — suspected Next 16 defaulting to Turbopack (native Rust).  
**Attempt:** Added `--no-turbopack` to devArgs.  
**Result:** `error: unknown option '--no-turbopack'` — flag does not exist in Next 16. Removed.

### 3. esbuild/rollup WASM overrides missing
**Observation:** Next's `package.json` was missing the `esbuild-wasm` and `@rollup/wasm-node` overrides present in all other recipes.  
**Fix:** Added overrides to `public/projects/next/package.json`.  
**Result:** No change to hang behaviour.

### 4. Confirmed `@next/swc-wasm-nodejs` loads but Next can't find it
**Test:** `import('@next/swc-wasm-nodejs')` → `swc ok`  
**Symptom:** Despite the package being installed, Next prints:
```
⚠ next-swc does not have native bindings for platform linux/wasm32.
  Downloading swc package @next/swc-wasm-nodejs... to /.cache/next-swc
```
Then hangs on the download.  
**Cause:** Next 16 looks for a native `.node` binary. The WASM package doesn't match what Next 16 expects — Next rejects the installed package and tries to download a fresh one. The download stalls (BrowserPod can make network requests but this particular download never completes).  
**Conclusion:** Next 16 is SWC-only with no Babel fallback. Dead end.

### 5. Downgraded to Next 14.2.29 + React 18.3.1
**Rationale:** Next 14 still supports Babel as a fallback when `babel.config.json` is present. SWC is attempted first but gracefully falls back.  
**Files changed:**
- `public/projects/next/package.json`: `next@14.2.29`, `react@18.3.1`, `react-dom@18.3.1`, removed `@next/swc-wasm-nodejs`
- `public/projects/next/babel.config.json` added: `{ "presets": ["next/babel"] }`
- `src/recipes.js` stack label updated

### 6. Programmatic server wrapper `start-next.mjs`
**Rationale:** Same approach that worked for Vite — use the programmatic API with diagnostic logging to find exactly where startup hangs.  
**Initial version:**
```js
process.env.NEXT_TELEMETRY_DISABLED = '1';
const next = (await import('next')).default;
const app = next({ dev: true, hostname: '0.0.0.0', port: 3000 });
await app.prepare();
http.createServer(app.getRequestHandler()).listen(3000, '0.0.0.0');
```

### 7. `ERR_INSPECTOR_NOT_AVAILABLE`
**Symptom:**
```
TypeError: Inspector is not available (ERR_INSPECTOR_NOT_AVAILABLE)
```
**Cause:** Next's webpack compilation loads the `node:inspector` built-in which BrowserPod does not implement.  
**Fix:** Patched `Module._load` in `start-next.mjs` to intercept `inspector`/`node:inspector` and return a stub object.  
**Result:** Error resolved.

### 8. `SecretKeyGenJob is not a constructor`
**Symptom:**
```
TypeError: SecretKeyGenJob is not a constructor
  at generateKey (...)
  at aesGenerateKey (...)
  at SubtleCrypto.__g__
```
**Cause:** BrowserPod's Web Crypto implementation doesn't support AES key generation (`crypto.subtle.generateKey`). Next 14 uses this for cookie/session signing during startup.  
**Fix:** Patched `globalThis.crypto.subtle.generateKey` and `exportKey` to catch failures and return stub key material (fixed 32-byte buffer from `crypto.randomBytes(32)`).  
**Result:** Error resolved.

### 9. Next 14 still tries to download SWC
**Symptom:**
```
⚠ Trying to load next-swc for unsupported platforms linux/wasm32
  Downloading swc package @next/swc-wasm-nodejs...
```
Then hangs.  
**Cause:** `@next/swc-wasm-nodejs` was removed from `package.json` in step 5. Without it, Next falls back to downloading.  
**Fix:** Added `babel.config.json` with `{ "presets": ["next/babel"] }`. Next 14 detects this and disables SWC in favour of Babel.  
**Result:** Next now prints:
```
Disabled SWC as replacement for Babel because of custom Babel configuration "babel.config.json"
```
No more download hang. SWC bypassed successfully.

### 10. `next.config.js` — `webpackBuildWorker: false`
**Rationale:** Next's webpack uses worker threads for compilation. Added config to disable build workers.  
**Result:** No observable change — `app.prepare()` still completes successfully regardless.

### 11. Client bundle fails: `node:https` not resolved
**Symptom:** After startup succeeds and port 3000 binds, compiling `/` fails:
```
⨯ ./node_modules/next/dist/client/components/react-dev-overlay/internal/helpers/getErrorByType.js
node:https:
```
Next's dev overlay imports `node:https` which webpack tries to bundle into the client-side JS — not valid in a browser context.  
**Consequence:** `fallback-build-manifest.json` is never written → every page request returns 500.

**Attempt A:** `resolve.alias` with `'node:https': false` etc.  
**Result:** No effect — webpack doesn't honour `resolve.alias: false` for `node:` built-ins.

**Attempt B:** `resolve.fallback` with bare module names (`https: false`, `http: false`, etc.)  
**Result:** No effect — webpack treats `node:https` as a different specifier from `https`.

**Attempt C:** `resolve.fallback` with both bare and `node:` prefixed names  
**Result:** Still failing.

### 12. `NormalModuleReplacementPlugin` with `/^node:/`
**Rationale:** Try intercepting `node:` prefixed imports at the NormalModuleFactory level, replacing with `empty-module.js`.
```js
new webpack.NormalModuleReplacementPlugin(
  /^node:/,
  require.resolve('./empty-module.js')
)
```
**Result:** No effect. Same `node:https` error and missing `fallback-build-manifest.json`.  
**Conclusion:** webpack 5 handles `node:` prefixed modules before `NormalModuleFactory.hooks.beforeResolve` fires. `NormalModuleReplacementPlugin` never sees them.

### 13. `resolve.alias` with actual file paths (in progress)
**Rationale:** Previous alias attempts used `false` (which means "no polyfill, emit error"). Using an actual path to `empty-module.js` should make webpack substitute the empty module instead of erroring. The `node-polyfill-webpack-plugin` uses this exact pattern for `node:` prefixed modules.
```js
const emptyModule = path.resolve(__dirname, 'empty-module.js');
const builtins = ['assert', 'async_hooks', 'buffer', ..., 'https', ...];
for (const name of builtins) {
  config.resolve.alias[`node:${name}`] = emptyModule;
}
```
**Result:** Pending test.

---

## Current State

- Next starts, binds port 3000, portal opens
- Babel is used for server-side compilation (SWC bypassed)
- Client-side bundle compilation fails on `node:https` in Next's dev overlay
- All page requests return 500

## Next Steps (if attempt 13 fails)

- Patch `getErrorByType.js` inside `node_modules/next` in `start-next.mjs` before importing Next — replace `require('node:https')` with a no-op stub. Direct file mutation, guaranteed to work.
- Alias the entire `react-dev-overlay` component chain to empty modules via `resolve.alias` on full file paths (e.g. `next/dist/client/components/react-dev-overlay/pages/hot-reloader-client`)
