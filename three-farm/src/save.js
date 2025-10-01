'use strict';

export function createSaveSystem(farming, world) {
  const KEY = 'three-farm-save-v1';
  let autosaveTimer = 0;

  function save() {
    try {
      const data = {
        farming: farming.serialize(),
        world: world.serialize(),
        t: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Save error', err);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.farming) farming.deserialize(data.farming);
      if (data.world) world.deserialize(data.world);
      return true;
    } catch (err) {
      console.error('Load error', err);
      return false;
    }
  }

  function queueAutosave() {
    if (autosaveTimer) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(save, 500);
  }

  return { save, load, queueAutosave };
}

