import { BrowserPod } from '@leaningtech/browserpod';

const PROJECT_ROOT = '/project';
const WASM_INIT_DELAY_MS = 500;

function log(message) {
  console.log(`[BrowserPod ${new Date().toISOString()}] ${message}`);
}

export async function runRecipeInBrowserPod({
  apiKey,
  consoleElement,
  recipe,
  onPortal,
  onStatus,
  onReady,
  launch = false,
  isCurrentRun = () => true,
}) {
  log(`Starting recipe: ${recipe.id}`);

  onStatus('Booting BrowserPod...', 'loading');
  log('Calling BrowserPod.boot()...');
  const pod = await BrowserPod.boot({ apiKey, nodeVersion: '22' });
  log('BrowserPod.boot() resolved.');
  assertCurrent(isCurrentRun);

  onStatus('Waiting for the WASM runtime to finish initializing...', 'loading');
  log(`Waiting ${WASM_INIT_DELAY_MS}ms for WASM runtime...`);
  await wait(WASM_INIT_DELAY_MS);
  log('WASM wait done.');
  assertCurrent(isCurrentRun);

  consoleElement.textContent = '';
  log('Creating terminal...');
  const terminal = await pod.createDefaultTerminal(consoleElement);
  log('Terminal created.');
  assertCurrent(isCurrentRun);

  pod.onPortal(({ url, port }) => {
    log(`Portal opened on port ${port}: ${url}`);
    if (isCurrentRun()) {
      onPortal({ url, port });
    }
  });

  onStatus(`Copying the ${recipe.name} files into /project...`, 'loading');
  log(`Copying ${recipe.files.length} file(s) into ${PROJECT_ROOT}...`);
  await copyRecipeProject(pod, recipe);
  log('File copy complete.');
  assertCurrent(isCurrentRun);

  onStatus('Installing npm dependencies inside BrowserPod...', 'loading');
  const installArgs = ['install', ...(recipe.installFlags ?? [])];
  log(`Running npm ${installArgs.join(' ')}...`);
  const installStart = Date.now();
  await pod.run('npm', installArgs, {
    cwd: PROJECT_ROOT,
    terminal,
    echo: true,
  });
  log(`npm install finished in ${((Date.now() - installStart) / 1000).toFixed(1)}s.`);
  assertCurrent(isCurrentRun);

  onReady?.({ pod, terminal });

  if (!launch) {
    onStatus('Install complete. Type commands below.', 'success');
    return;
  }

  const devCmd = recipe.devCmd ?? 'npm';
  const devArgs = recipe.devArgs ?? ['run', 'dev'];
  onStatus(`Starting ${recipe.name} with ${recipe.command}...`, 'loading');
  log(`Running ${devCmd} ${devArgs.join(' ')}...`);
  const devProcess = pod.run(devCmd, devArgs, {
    cwd: PROJECT_ROOT,
    terminal,
    echo: true,
  });
  devProcess.then(
    () => { log('npm run dev exited.'); },
    (err) => {
      log(`npm run dev failed: ${err}`);
      console.error('[BrowserPod] npm run dev error:', err);
      onStatus(`${recipe.name} dev server failed. See console for details.`, 'error');
    }
  );

  onStatus(
    'Waiting for the inner app to listen on port 3000 and create a portal...',
    'loading'
  );
  log('Waiting for portal on port 3000...');
}

async function copyRecipeProject(pod, recipe) {
  const directories = new Set([PROJECT_ROOT]);

  for (const filePath of recipe.files) {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      directories.add(`${PROJECT_ROOT}/${filePath.slice(0, lastSlashIndex)}`);
    }
  }

  for (const directory of [...directories].sort()) {
    await pod.createDirectory(directory, { recursive: true });
  }

  for (const filePath of recipe.files) {
    await copyPublicFile(
      pod,
      `/projects/${recipe.id}/${filePath}`,
      `${PROJECT_ROOT}/${filePath}`
    );
  }
}

async function copyPublicFile(pod, sourcePath, destinationPath) {
  const response = await fetch(sourcePath);
  if (!response.ok) {
    throw new Error(`Could not fetch ${sourcePath}.`);
  }

  const data = await response.arrayBuffer();
  const file = await pod.createFile(destinationPath, 'binary');
  await file.write(data);
  await file.close();
}

function assertCurrent(isCurrentRun) {
  if (!isCurrentRun()) {
    const error = new Error('A newer recipe run replaced this one.');
    error.code = 'STALE_RUN';
    throw error;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
