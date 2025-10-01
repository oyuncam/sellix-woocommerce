'use strict';

export function createWorld(THREE, scene) {
  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Farm grid parameters
  const tilesPerSide = 20; // 20 x 20 = 400 plots
  const tileSize = 2;
  const farmGroup = new THREE.Group();
  farmGroup.name = 'FarmGroup';
  scene.add(farmGroup);

  // Materials
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x5b3a29, roughness: 0.9 });
  const soilGrowingMat = new THREE.MeshStandardMaterial({ color: 0x6d4632, roughness: 0.9 });
  const soilGrownMat = new THREE.MeshStandardMaterial({ color: 0x6a3f2b, roughness: 0.9, emissive: 0x2d6a4f, emissiveIntensity: 0.35 });

  const plotGeo = new THREE.PlaneGeometry(tileSize, tileSize);
  plotGeo.rotateX(-Math.PI / 2);

  const plots = new Map(); // key: "gx,gz" -> plot

  for (let gz = 0; gz < tilesPerSide; gz++) {
    for (let gx = 0; gx < tilesPerSide; gx++) {
      const mesh = new THREE.Mesh(plotGeo, soilMat.clone());
      mesh.position.set((gx - tilesPerSide / 2) * tileSize + tileSize / 2, 0.001, (gz - tilesPerSide / 2) * tileSize + tileSize / 2);
      mesh.receiveShadow = true;
      mesh.userData = { isPlot: true, gx, gz, x: mesh.position.x, z: mesh.position.z, state: 'empty' };
      farmGroup.add(mesh);
      plots.set(key(gx, gz), mesh);
    }
  }

  // Highlight quad
  const highlightGeo = new THREE.PlaneGeometry(tileSize * 1.02, tileSize * 1.02);
  highlightGeo.rotateX(-Math.PI / 2);
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, depthWrite: false });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.position.y = 0.012;
  highlight.visible = false;
  farmGroup.add(highlight);

  function key(gx, gz) { return `${gx},${gz}`; }

  function setHighlightVisible(v) { highlight.visible = v; }
  function moveHighlightTo(x, z) { highlight.visible = true; highlight.position.set(x, 0.012, z); }

  function setPlotState(gx, gz, state) {
    const m = plots.get(key(gx, gz));
    if (!m) return;
    m.userData.state = state;
    if (state === 'empty') m.material = soilMat;
    else if (state === 'growing') m.material = soilGrowingMat;
    else if (state === 'grown') m.material = soilGrownMat;
  }

  function getPlot(gx, gz) { return plots.get(key(gx, gz)); }

  function getGroundHeight() { return 0; }

  function serialize() {
    const out = [];
    for (const [k, mesh] of plots.entries()) {
      out.push({ key: k, state: mesh.userData.state });
    }
    return { plots: out };
  }

  function deserialize(data) {
    if (!data || !data.plots) return;
    for (const item of data.plots) {
      const [gx, gz] = item.key.split(',').map(Number);
      setPlotState(gx, gz, item.state);
    }
  }

  return {
    farmGroup,
    plots,
    setPlotState,
    getPlot,
    moveHighlightTo,
    setHighlightVisible,
    getGroundHeight,
    serialize,
    deserialize,
  };
}

