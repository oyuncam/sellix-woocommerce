'use strict';

export function createFarmingSystem(THREE, scene, world) {
  const plantTypes = [
    { id: 'wheat', displayName: 'Buğday', color: 0xa3d977, growSeconds: [180, 180, 180], buyPrice: 0, sellPrice: 8 },
    { id: 'carrot', displayName: 'Havuç', color: 0xffa94d, growSeconds: [240, 240, 240], buyPrice: 0, sellPrice: 12 },
    { id: 'corn', displayName: 'Mısır', color: 0xffe066, growSeconds: [300, 300, 300], buyPrice: 0, sellPrice: 20 },
  ];

  const inventory = {
    coins: 0,
    seeds: { wheat: 5, carrot: 0, corn: 0 },
  };

  let selectedSeedIndex = 0;

  // Active plant meshes per plot
  const plantMeshes = new Map(); // key: "gx,gz" -> mesh
  const stalkGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 6);

  function key(gx, gz) { return `${gx},${gz}`; }

  function plantAt(gx, gz) {
    const type = plantTypes[selectedSeedIndex];
    if (inventory.seeds[type.id] <= 0) return false;
    const plot = world.getPlot(gx, gz);
    if (!plot || plot.userData.state !== 'empty') return false;

    inventory.seeds[type.id] -= 1;
    const mesh = new THREE.Mesh(stalkGeo, new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.6 }));
    mesh.position.set(plot.position.x, 0.26, plot.position.z);
    mesh.castShadow = true;
    mesh.userData = { plantedAt: gameSeconds(), stage: 0, typeId: type.id };
    scene.add(mesh);
    plantMeshes.set(key(gx, gz), mesh);
    world.setPlotState(gx, gz, 'growing');
    return true;
  }

  function harvestAt(gx, gz) {
    const plot = world.getPlot(gx, gz);
    if (!plot || plot.userData.state !== 'grown') return false;
    const pKey = key(gx, gz);
    const mesh = plantMeshes.get(pKey);
    if (mesh) {
      const type = plantTypes.find(t => t.id === mesh.userData.typeId);
      scene.remove(mesh);
      plantMeshes.delete(pKey);
      if (type) inventory.coins += type.sellPrice;
    }
    world.setPlotState(gx, gz, 'empty');
    return true;
  }

  // Simple global game time fallback; replaced by main update via tick
  let internalGameSeconds = 0;
  function gameSeconds() { return internalGameSeconds; }

  function tick(deltaGameSeconds) {
    internalGameSeconds += deltaGameSeconds;
    for (const [pKey, mesh] of plantMeshes.entries()) {
      const type = plantTypes.find(t => t.id === mesh.userData.typeId);
      if (!type) continue;
      const age = gameSeconds() - mesh.userData.plantedAt;
      const s0 = type.growSeconds[0];
      const s1 = s0 + type.growSeconds[1];
      const s2 = s1 + type.growSeconds[2];
      let stage = 0;
      if (age >= s2) stage = 3; else if (age >= s1) stage = 2; else if (age >= s0) stage = 1; else stage = 0;
      if (stage !== mesh.userData.stage) {
        mesh.userData.stage = stage;
      }
      // Visual scale by stage
      const h = stage === 0 ? 0.5 : stage === 1 ? 0.9 : stage === 2 ? 1.3 : 1.6;
      mesh.scale.set(1, h, 1);
      mesh.position.y = (h * 0.5);

      // When fully grown, mark plot
      const [gx, gz] = pKey.split(',').map(Number);
      if (stage >= 3) world.setPlotState(gx, gz, 'grown');
    }
  }

  function getInventory() {
    // Shallow clone for UI read
    return {
      coins: inventory.coins,
      seeds: { ...inventory.seeds },
    };
  }

  function getSelectedSeed() { return plantTypes[selectedSeedIndex]; }
  function setSelectedSeedIndex(i) { selectedSeedIndex = Math.max(0, Math.min(plantTypes.length - 1, i)); }
  function cycleSeed() { selectedSeedIndex = (selectedSeedIndex + 1) % plantTypes.length; }

  function serialize() {
    const plants = [];
    for (const [k, mesh] of plantMeshes.entries()) {
      plants.push({ key: k, typeId: mesh.userData.typeId, plantedAt: mesh.userData.plantedAt, stage: mesh.userData.stage });
    }
    return {
      inventory: { coins: inventory.coins, seeds: { ...inventory.seeds } },
      plants,
    };
  }

  function deserialize(data) {
    if (!data) return;
    if (data.inventory) {
      inventory.coins = data.inventory.coins || 0;
      inventory.seeds = { ...inventory.seeds, ...(data.inventory.seeds || {}) };
    }
    if (Array.isArray(data.plants)) {
      for (const p of data.plants) {
        const [gx, gz] = p.key.split(',').map(Number);
        const plot = world.getPlot(gx, gz);
        if (!plot) continue;
        const type = plantTypes.find(t => t.id === p.typeId) || plantTypes[0];
        const mesh = new THREE.Mesh(stalkGeo, new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.6 }));
        mesh.position.set(plot.position.x, 0.26, plot.position.z);
        mesh.castShadow = true;
        mesh.userData = { plantedAt: p.plantedAt || 0, stage: p.stage || 0, typeId: type.id };
        scene.add(mesh);
        plantMeshes.set(key(gx, gz), mesh);
        world.setPlotState(gx, gz, p.stage >= 3 ? 'grown' : 'growing');
      }
    }
  }

  return {
    plantAt,
    harvestAt,
    tick,
    getInventory,
    getSelectedSeed,
    setSelectedSeedIndex,
    cycleSeed,
    serialize,
    deserialize,
  };
}

