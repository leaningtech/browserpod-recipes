import { mkdirSync } from 'fs';

// Set before dynamic import so os.homedir() / conf reads the new value
process.env.ASTRO_TELEMETRY_DISABLED = '1';
process.env.DO_NOT_TRACK = '1';
process.env.HOME = '/tmp';
process.env.XDG_CONFIG_HOME = '/tmp/.config';

// Pre-create directories that @astrojs/telemetry (via conf) writes to
for (const dir of ['/tmp/.config', '/tmp/.config/astro', '/tmp/.astro']) {
  try { mkdirSync(dir, { recursive: true }); } catch (e) {}
}

await import('./node_modules/astro/bin/astro.mjs');
