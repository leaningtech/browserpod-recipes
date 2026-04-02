import { runRecipeInBrowserPod } from './browserpod.js';
import { defaultRecipeId, recipeMap, recipes } from './recipes.js';

const recipeSelect = document.querySelector('#recipe-select');
const runButton = document.querySelector('#run-button');
const statusEl = document.querySelector('#status');
const portalFrame = document.querySelector('#portal');
const portalUrl = document.querySelector('#url');
const previewEmpty = document.querySelector('#preview-empty');
const consoleEl = document.querySelector('#console');
const cmdForm = document.querySelector('#cmd-form');
const cmdInput = document.querySelector('#cmd-input');
const cmdCwd = document.querySelector('#cmd-cwd');

const shell = { pod: null, terminal: null, cwd: '/project', scriptCounter: 0 };

const state = {
  currentRunToken: 0,
  preferredPort: 3000,
};

for (const recipe of recipes) {
  const option = document.createElement('option');
  option.value = recipe.id;
  option.textContent = recipe.name;
  recipeSelect.append(option);
}

const initialRecipeId = recipeMap.has(window.location.hash.slice(1))
  ? window.location.hash.slice(1)
  : defaultRecipeId;

recipeSelect.value = initialRecipeId;

recipeSelect.addEventListener('change', () => {
  window.location.hash = recipeSelect.value;
  setStatus('', 'neutral');
});

runButton.addEventListener('click', async () => {
  const recipe = getSelectedRecipe();
  const apiKey = import.meta.env.VITE_BP_APIKEY;

  if (!apiKey) {
    setStatus('Missing VITE_BP_APIKEY.', 'error');
    return;
  }

  const runToken = ++state.currentRunToken;
  resetPreview();
  consoleEl.textContent = '';
  cmdForm.hidden = true;
  shell.pod = null;
  shell.terminal = null;
  runButton.disabled = true;
  runButton.textContent = 'Running…';

  try {
    await runRecipeInBrowserPod({
      apiKey,
      consoleElement: consoleEl,
      recipe,
      launch: true,
      isCurrentRun: () => runToken === state.currentRunToken,
      onReady: ({ pod, terminal }) => {
        shell.pod = pod;
        shell.terminal = terminal;
        shell.cwd = '/project';
        cmdCwd.textContent = shell.cwd;
        pod.createDirectory('/tmp', { recursive: true }).then(() => {
          cmdForm.hidden = false;
          cmdInput.focus();
        });
      },
      onPortal: ({ url, port }) => {
        if (port !== state.preferredPort && portalFrame.src) return;
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        portalUrl.replaceChildren(link);
        previewEmpty.hidden = true;
        portalFrame.hidden = false;
        portalFrame.src = url;
        setStatus(`${recipe.name} running on port ${port}.`, 'success');
      },
      onStatus: setStatus,
    });
  } catch (error) {
    if (error?.code !== 'STALE_RUN') {
      console.error(error);
      setStatus(`${error.message}`, 'error');
    }
  } finally {
    if (runToken === state.currentRunToken) {
      runButton.disabled = false;
      runButton.textContent = 'Run';
    }
  }
});

cmdForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = cmdInput.value.trim();
  if (!input || !shell.pod) return;
  cmdInput.value = '';

  const translated = translateCommand(input, shell.cwd);

  if (translated.cd != null) {
    shell.cwd = translated.cd;
    cmdCwd.textContent = shell.cwd;
    return;
  }

  if (translated.script != null) {
    const tmpPath = `/tmp/_bp_cmd_${++shell.scriptCounter}.js`;
    try {
      const file = await shell.pod.createFile(tmpPath, 'binary');
      await file.write(new TextEncoder().encode(translated.script).buffer);
      await file.close();
    } catch (err) {
      console.error('[shell] write error:', err);
      return;
    }
    const proc = shell.pod.run('node', [tmpPath], { cwd: shell.cwd, terminal: shell.terminal, echo: false });
    proc.then(() => {}, (err) => console.error('[shell]', err));
  } else {
    const proc = shell.pod.run(translated.cmd, translated.args, { cwd: shell.cwd, terminal: shell.terminal, echo: true });
    proc.then(() => {}, (err) => console.error('[shell]', err));
  }
});

function translateCommand(input, cwd) {
  const parts = splitArgs(input);
  const [head, ...rest] = parts;

  switch (head) {
    case 'cd': {
      if (!rest[0]) return { cd: '/project' };
      const target = rest[0].startsWith('/') ? rest[0] : `${cwd}/${rest[0]}`.replace(/\/+/g, '/');
      return { cd: target };
    }

    case 'node':
      return { cmd: 'node', args: rest };

    case 'npm':
      return { cmd: 'npm', args: rest };

    case 'ls': {
      const target = rest[0] || '.';
      return { script: `try { require('fs').readdirSync(${JSON.stringify(target)}).forEach(f => console.log(f)); } catch(e) { console.error(e.message); }` };
    }

    case 'cat': {
      const file = rest[0] || '';
      return { script: `try { process.stdout.write(require('fs').readFileSync(${JSON.stringify(file)}, 'utf8')); } catch(e) { console.error(e.message); }` };
    }

    case 'pwd':
      return { script: `console.log(process.cwd());` };

    case 'echo':
      return { script: `console.log(${JSON.stringify(rest.join(' '))});` };

    case 'which': {
      const bin = rest[0] || '';
      return { script: `const p = (process.env.PATH||'').split(':'); const fs = require('fs'), path = require('path'); const found = p.map(d => path.join(d, ${JSON.stringify(bin)})).find(f => { try { fs.accessSync(f); return true; } catch { return false; } }); console.log(found || 'not found');` };
    }

    default:
      // Fall back: run as a node script file
      return { cmd: 'node', args: [head, ...rest] };
  }
}

function splitArgs(input) {
  const args = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (const ch of input) {
    if (ch === "'" && !inDouble) { inSingle = !inSingle; }
    else if (ch === '"' && !inSingle) { inDouble = !inDouble; }
    else if (ch === ' ' && !inSingle && !inDouble) {
      if (current) { args.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

function getSelectedRecipe() {
  return recipeMap.get(recipeSelect.value);
}

function resetPreview() {
  portalFrame.hidden = true;
  portalFrame.removeAttribute('src');
  previewEmpty.hidden = false;
  portalUrl.replaceChildren();
}

function setStatus(message, stateName = 'neutral') {
  statusEl.textContent = message;
  statusEl.dataset.state = stateName;
}
