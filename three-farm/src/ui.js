'use strict';

export function createUI() {
  const timeEl = document.getElementById('time');
  const coinsEl = document.getElementById('coins');
  const seedsEl = document.getElementById('seeds');
  const selectedSeedEl = document.getElementById('selected-seed');
  const promptEl = document.getElementById('prompt');

  let hidePromptTimer = 0;

  function setTime(text) { if (timeEl) timeEl.textContent = text; }
  function updateInventory(inv) {
    if (coinsEl) coinsEl.textContent = `Altın: ${inv.coins}`;
    if (seedsEl) seedsEl.textContent = `Tohumlar: Buğday(${inv.seeds.wheat||0}) Havuç(${inv.seeds.carrot||0}) Mısır(${inv.seeds.corn||0})`;
  }
  function updateSelectedSeed(seedType) { if (selectedSeedEl) selectedSeedEl.textContent = `Seçili: ${seedType.displayName}`; }

  function setPrompt(text) {
    if (!promptEl) return;
    promptEl.textContent = text;
    if (text && text.length > 0) { promptEl.classList.add('show'); }
    else { promptEl.classList.remove('show'); }
  }
  function showPrompt(text, ms = 1200) {
    setPrompt(text);
    if (hidePromptTimer) window.clearTimeout(hidePromptTimer);
    hidePromptTimer = window.setTimeout(() => setPrompt(''), ms);
  }

  return { setTime, updateInventory, updateSelectedSeed, setPrompt, showPrompt };
}

