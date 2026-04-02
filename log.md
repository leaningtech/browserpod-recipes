# BrowserPod Recipes — Debug Log

## Goal
Get all recipes running in BrowserPod: Express, React, Vue, Svelte, Vite (plain/smoke tests), Next, Nuxt, Astro.

---

## What Works
- **Express** — `node server.js` — confirmed working, portal URL appears and loads correctly.

---

## What Doesn't Work (current state)
- All Vite-based recipes (React, Vue, Svelte, vite-plain, vite-react-smoke, vite-vue-smoke, vite-svelte-smoke) — silent crash, no output after command echo
- Astro — `TypeError: Cannot read properties of undefined (reading 'record')` on startup
- Next, Nuxt — install completes but portal never appears; service worker disconnects during install

## Observed Failure Sequence (Next.js example)

```text
28f41fa02-...:1  TODO: SYS_GETSOCKOPT - level: 1 optname 8
browserpod.js:7  [BrowserPod ...] npm install finished in 58.8s.
browserpod.js:7  [BrowserPod ...] Running node node_modules/next/dist/bin/next dev --webpack -H 0.0.0.0 -p 3000...
browserpod.js:7  [BrowserPod ...] Waiting for portal on port 3000...
```

Key observations:

1. `SYS_GETSOCKOPT` still fires even with `--ignore-scripts` — apparently npm itself or some non-postinstall path triggers it
2. npm install still completes despite the error
3. Dev server command is issued and starts
4. Portal on port 3000 is never delivered — Next.js either crashes before binding or the BrowserPod service worker is in a broken state after the `SYS_GETSOCKOPT` error

---

## Attempts in Order

### 1. Content simplification
Simplified all recipe component files to plain `<h1>Hello World</h1>` boilerplate. Not related to the run failure.

### 2. Logging added to `src/browserpod.js`
Added timestamped `log()` function and structured logging around install and dev server steps to improve visibility into what was happening.

### 3. `npm install` freezing — `SYS_GETSOCKOPT` crash
**Symptom:** npm install hangs indefinitely for Next, Nuxt, Astro.  
**Cause:** Postinstall scripts in packages with native binaries (esbuild, sharp, etc.) call `getsockopt` syscall which is unimplemented in BrowserPod's WASM runtime.  
**Fix:** Added `installFlags: ['--ignore-scripts']` to `next`, `nuxt`, `astro` recipes in `src/recipes.js`.  
**Result:** Install completes for those recipes.

### 4. Portal never appearing — `npm run dev` via execve
**Symptom:** After install, `npm run dev` echoes in the terminal but the portal URL never fires.  
**Cause:** `npm run dev` spawns `node server.js` (or `vite` etc.) via BrowserPod's `handleExecve` in the service worker. If Chrome suspends/kills the service worker, the execve call silently fails and the child process never starts.  
**Fix:** Added `devCmd`/`devArgs` fields to recipes so the orchestrator calls `pod.run('node', ['server.js'])` directly, bypassing npm and execve entirely. Direct runs use `cos.runESM()` in a web worker, not the service worker.  
**Result:** Express works correctly. Other recipes still needed the same treatment.

### 5. `TypeError: Cannot read properties of undefined (reading 'catch')`
**Symptom:** JS error in `src/browserpod.js` when setting up the dev process error handler.  
**Cause:** `pod.run()` returns a `BrowserPodProcess` thenable, not a real Promise. `.then()` returns `undefined`, so chaining `.catch()` on it throws.  
**Fix:** Changed to `devProcess.then(onFulfilled, onRejected)` with two arguments.

### 6. Added `devCmd`/`devArgs` to all recipes
Applied the express fix pattern to every recipe:
- Vite-based (7 recipes): `node node_modules/vite/bin/vite.js`
- Nuxt: `node node_modules/nuxt/bin/nuxt.mjs dev --host 0.0.0.0 --port 3000`
- Next: `node node_modules/next/dist/bin/next dev --webpack -H 0.0.0.0 -p 3000`
- Astro: `node node_modules/astro/bin/astro.mjs dev --host 0.0.0.0 --port 3000` *(wrong path initially — was `.js`, fixed to `.mjs`)*

### 7. `--ignore-scripts` extended to all Vite recipes
Added `installFlags: ['--ignore-scripts']` to all 7 Vite-based recipes to prevent any transitive postinstall scripts from triggering `SYS_GETSOCKOPT`.

### 8. Explicit `--host`/`--port` in Vite devArgs
Added `--host 0.0.0.0 --port 3000` directly to Vite devArgs as CLI flags, in addition to the config already having `server: { host, port }`.

### 9. Astro — wrong bin path
**Symptom:** Astro crashes immediately.  
**Cause:** devArgs had `node_modules/astro/bin/astro.js` but the correct path is `node_modules/astro/bin/astro.mjs`.  
**Fix:** Updated path.

### 10. Curly quotes syntax error in `src/recipes.js`
**Symptom:** Parse error around line 236 of recipes.js.  
**Cause:** Smart/curly quotes (`'` `'`) used as JS string delimiters in the Astro section.  
**Fix:** Python script to replace all Unicode curly quotes with straight ASCII quotes.

### 11. Astro — `TypeError: Cannot read properties of undefined (reading 'record')`
**Symptom:** Astro starts, crashes with this error pointing to `throwAndExit` in BrowserPod's eval stack.  
**Root cause analysis:** Astro's CLI catches an internal startup error, then calls `throwAndExit(telemetry, err)`. The `telemetry` object is `undefined` (because telemetry initialization itself failed), so `telemetry.record(event)` throws a second error — hiding the original one.  
**Attempt A:** Set `ASTRO_TELEMETRY_DISABLED=1` and `DO_NOT_TRACK=1` via `astro-start.mjs` wrapper before importing Astro.  
**Result:** Same error. Env vars don't prevent telemetry from trying to initialize.  
**Attempt B:** Set `HOME=/tmp`, `XDG_CONFIG_HOME=/tmp/.config`, pre-create `~/.config/astro/` and `~/.astro/` directories before import.  
**Result:** Same error. Filesystem pre-creation didn't fix it.  
**Status:** Root cause of telemetry init failure unknown. The real underlying startup error is hidden by the cascade crash.

### 12. `RangeError: offset is out of bounds` — install freeze

**Symptom:** npm install freezes (no progress, no completion) with this error visible in the browser console:

```text
Uncaught (in promise) RangeError: offset is out of bounds
    at Uint8Array.set (<anonymous>)
    at rs.g [as a0] (browserpod.js:1:53439)
    at Wr.Ge (browserpod.js:1:90785)
    at Ye (browserpod.js:1:91400)
    at browserpod.js:1:169159
```

**Cause:** BrowserPod's own runtime (`browserpod.js`) is crashing internally. The error is in BrowserPod's WASM-to-JS memory bridge — a typed array buffer write goes out of bounds. Not caused by our recipe code. Likely triggered when npm tries to write a package that either (a) exceeds the virtual disk capacity of BrowserPod's `node22.ext2` image, or (b) when a native binary (e.g. oxc-transform from Vite 8) causes a memory corruption that propagates into BrowserPod's buffer management.  
**Status:** Seen during install for Vite 8 recipes. Downgrading to Vite 7 may resolve the oxc-transform case.

### 13. Vite — silent crash, no output
**Symptom:** `node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000` echoes but produces zero output and no portal. Not even Vite's startup banner.  
**Hypothesis A:** `fs.watch` / chokidar hangs because BrowserPod's virtual FS has no inotify.  
**Hypothesis B:** esbuild-wasm or rolldown hangs/crashes during initialization.  
**Attempt:** Added `server: { watch: null }` and `optimizeDeps: { noDiscovery: true, include: [] }` to all vite.config.js files.  
**Result:** Same silent crash.  
**Root cause identified:** Vite 8 replaced esbuild with **oxc-transform** (Rust) and **rolldown** (Rust) for its core transform pipeline. These are native binaries with no WASM fallback. The `esbuild-wasm` override is irrelevant because Vite 8 no longer uses esbuild. oxc-transform crashes the WASM runtime on import — before Vite can print anything.  
**Fix in progress:** Downgrading all Vite recipes from `8.0.2` → `7.2.4`. Vite 7 still uses esbuild (replaceable with `esbuild-wasm`) and rollup (replaceable with `@rollup/wasm-node`).  
**Plugin version updates also needed:** `@vitejs/plugin-react`, `@vitejs/plugin-vue`, `@sveltejs/vite-plugin-svelte` versions 6.x/7.x were released for Vite 8 and need to be downgraded to their Vite 7 compatible versions.

---

## Current State of `src/recipes.js` (key fields)

| Recipe | installFlags | devCmd | devArgs |
|--------|-------------|--------|---------|
| express | — | node | server.js |
| next | --ignore-scripts | node | node_modules/next/dist/bin/next dev --webpack -H 0.0.0.0 -p 3000 |
| nuxt | --ignore-scripts | node | node_modules/nuxt/bin/nuxt.mjs dev --host 0.0.0.0 --port 3000 |
| astro | --ignore-scripts | node | astro-start.mjs dev --host 0.0.0.0 --port 3000 |
| vite-plain | --ignore-scripts | node | node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000 |
| vite-react-smoke | --ignore-scripts | node | node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000 |
| vite-vue-smoke | --ignore-scripts | node | node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000 |
| vite-svelte-smoke | --ignore-scripts | node | node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000 |
| svelte | --ignore-scripts | node | node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000 |
| react | --ignore-scripts | node | node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000 |
| vue | --ignore-scripts | node | node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000 |

## Key BrowserPod Constraints Discovered
1. `SYS_GETSOCKOPT` is unimplemented — native binary postinstall scripts crash npm. Fix: `--ignore-scripts`.
2. `handleExecve` in the service worker is unreliable — use `pod.run('node', [...])` directly.
3. `BrowserPodProcess.then()` returns `undefined` — cannot chain `.catch()`.
4. Vite 8+ uses oxc-transform and rolldown (native Rust binaries) — incompatible with BrowserPod.
5. Vite 7 with `esbuild-wasm` + `@rollup/wasm-node` overrides is the expected compatible version.
