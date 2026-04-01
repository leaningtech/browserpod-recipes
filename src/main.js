import { runRecipeInBrowserPod } from './browserpod.js';
import { defaultRecipeId, recipeMap, recipes } from './recipes.js';

const recipeSelect = document.querySelector('#recipe-select');
const runButton = document.querySelector('#run-button');
const recipeTitle = document.querySelector('#recipe-title');
const recipeKind = document.querySelector('#recipe-kind');
const recipeDescription = document.querySelector('#recipe-description');
const recipeCommand = document.querySelector('#recipe-command');
const recipeStack = document.querySelector('#recipe-stack');
const recipeNotes = document.querySelector('#recipe-notes');
const statusEl = document.querySelector('#status');
const portalFrame = document.querySelector('#portal');
const portalUrl = document.querySelector('#url');
const previewEmpty = document.querySelector('#preview-empty');
const consoleEl = document.querySelector('#console');

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
renderRecipe(recipeMap.get(initialRecipeId));

recipeSelect.addEventListener('change', () => {
  const recipe = getSelectedRecipe();
  window.location.hash = recipe.id;
  renderRecipe(recipe);
  setStatus(`Ready to boot the ${recipe.name} recipe in a fresh pod.`, 'neutral');
});

runButton.addEventListener('click', async () => {
  const recipe = getSelectedRecipe();
  const apiKey = import.meta.env.VITE_BP_APIKEY;

  if (!apiKey) {
    setStatus(
      'Missing VITE_BP_APIKEY. Add it to recipes/.env before running a recipe.',
      'error'
    );
    return;
  }

  const runToken = ++state.currentRunToken;
  resetPreview();
  consoleEl.textContent = '';
  runButton.disabled = true;
  runButton.textContent = `Booting ${recipe.name}...`;

  try {
    await runRecipeInBrowserPod({
      apiKey,
      consoleElement: consoleEl,
      recipe,
      isCurrentRun: () => runToken === state.currentRunToken,
      onPortal: ({ url, port }) => {
        if (port !== state.preferredPort && portalFrame.src) {
          return;
        }

        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';

        portalUrl.replaceChildren(link);
        previewEmpty.hidden = true;
        portalFrame.hidden = false;
        portalFrame.src = url;
        setStatus(
          `${recipe.name} is running inside BrowserPod and exposed on port ${port}.`,
          'success'
        );
      },
      onStatus: setStatus,
    });
  } catch (error) {
    if (error?.code !== 'STALE_RUN') {
      console.error(error);
      setStatus(
        `Failed to start the ${recipe.name} recipe. ${error.message}`,
        'error'
      );
    }
  } finally {
    if (runToken === state.currentRunToken) {
      runButton.disabled = false;
      runButton.textContent = 'Run selected recipe';
    }
  }
});

function getSelectedRecipe() {
  return recipeMap.get(recipeSelect.value);
}

function renderRecipe(recipe) {
  recipeTitle.textContent = recipe.name;
  recipeKind.textContent = recipe.kind;
  recipeDescription.textContent = recipe.description;
  recipeCommand.textContent = recipe.command;
  recipeStack.textContent = recipe.stack;
  recipeNotes.replaceChildren();

  for (const note of recipe.notes) {
    const item = document.createElement('li');
    item.textContent = note;
    recipeNotes.append(item);
  }
}

function resetPreview() {
  portalFrame.hidden = true;
  portalFrame.removeAttribute('src');
  previewEmpty.hidden = false;
  portalUrl.textContent = 'Portal URL will appear here.';
}

function setStatus(message, stateName = 'neutral') {
  statusEl.textContent = message;
  statusEl.dataset.state = stateName;
}
