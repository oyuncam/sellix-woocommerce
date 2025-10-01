/* eslint-disable no-undef */
'use strict';

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

import { createWorld } from './world.js';
import { createFarmingSystem } from './farming.js';
import { createUI } from './ui.js';
import { createSaveSystem } from './save.js';

const app = (() => {
  const canvasParent = document.body;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  canvasParent.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 1.7, 5);

  // Lights
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2e2e2e, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);

  // Player and controls
  const controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const keys = new Set();
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const playerHeight = 1.7;
  const speedMetersPerSecond = 6.5;
  const damping = 0.12;

  // World and gameplay systems
  const world = createWorld(THREE, scene);
  const farming = createFarmingSystem(THREE, scene, world);
  const ui = createUI();
  const save = createSaveSystem(farming, world);

  // Restore save
  save.load();
  ui.updateInventory(farming.getInventory());

  // Pointer lock
  const overlay = document.getElementById('overlay');
  overlay.addEventListener('click', () => {
    controls.lock();
  });
  controls.addEventListener('lock', () => {
    overlay.style.display = 'none';
  });
  controls.addEventListener('unlock', () => {
    overlay.style.display = '';
  });

  // Input
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyQ') {
      farming.cycleSeed();
      ui.updateSelectedSeed(farming.getSelectedSeed());
    } else if (e.code === 'Digit1') {
      farming.setSelectedSeedIndex(0); ui.updateSelectedSeed(farming.getSelectedSeed());
    } else if (e.code === 'Digit2') {
      farming.setSelectedSeedIndex(1); ui.updateSelectedSeed(farming.getSelectedSeed());
    } else if (e.code === 'Digit3') {
      farming.setSelectedSeedIndex(2); ui.updateSelectedSeed(farming.getSelectedSeed());
    } else if (e.code === 'KeyE') {
      interact();
    }
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); });

  // Raycaster for plot targeting
  const raycaster = new THREE.Raycaster();
  const rayDirection = new THREE.Vector3();

  function interact() {
    const hit = pickFarmTile();
    if (!hit) return;
    const { plot } = hit;
    if (!plot) return;
    if (plot.state === 'empty') {
      const planted = farming.plantAt(plot.gx, plot.gz);
      if (planted) {
        ui.showPrompt('Ekim yapıldı');
        ui.updateInventory(farming.getInventory());
        save.queueAutosave();
      } else {
        ui.showPrompt('Tohum yok');
      }
    } else if (plot.state === 'grown') {
      const harvested = farming.harvestAt(plot.gx, plot.gz);
      if (harvested) {
        ui.showPrompt('Hasat edildi');
        ui.updateInventory(farming.getInventory());
        save.queueAutosave();
      }
    } else {
      ui.showPrompt('Büyüyor...');
    }
  }

  function pickFarmTile() {
    rayDirection.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    raycaster.set(camera.position, rayDirection);
    const intersects = raycaster.intersectObject(world.farmGroup, true);
    if (intersects.length === 0) { world.setHighlightVisible(false); ui.setPrompt(''); return null; }
    const i = intersects[0];
    if (!i.object || !i.object.userData || !i.object.userData.isPlot) { world.setHighlightVisible(false); ui.setPrompt(''); return null; }
    const plot = i.object.userData;
    world.moveHighlightTo(plot.x, plot.z);
    const text = plot.state === 'empty' ? 'E: Ekim' : (plot.state === 'grown' ? 'E: Hasat' : 'Büyüyor');
    ui.setPrompt(text);
    return { plot };
  }

  // Day-night cycle
  const dayLengthSeconds = 600; // 10 minutes per day
  let gameSeconds = 7 * 3600; // start at 07:00 for nice lighting
  const timeScale = 60; // 1 real second = 1 in-game minute

  function updateDayNight(deltaSeconds) {
    gameSeconds += deltaSeconds * timeScale;
    const dayProgress = (gameSeconds % dayLengthSeconds) / dayLengthSeconds; // [0,1)
    const angle = dayProgress * Math.PI * 2 - Math.PI / 2; // -90deg sunrise at 0
    const sunDir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.25).normalize();
    sun.position.copy(sunDir.clone().multiplyScalar(80));
    sun.intensity = THREE.MathUtils.lerp(0.05, 1.25, Math.max(0, sunDir.y));
    hemi.intensity = THREE.MathUtils.lerp(0.05, 0.9, Math.max(0, sunDir.y));

    // Sky color gradient
    const daySky = new THREE.Color(0x87ceeb);
    const nightSky = new THREE.Color(0x02050a);
    const t = THREE.MathUtils.smoothstep(Math.max(0, sunDir.y), 0.0, 1.0);
    scene.background = daySky.clone().lerp(nightSky, 1 - t);

    // Update UI time
    const hours = Math.floor((gameSeconds % 86400) / 3600);
    const minutes = Math.floor((gameSeconds % 3600) / 60);
    ui.setTime(hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0'));

    // Farming growth tick
    farming.tick(deltaSeconds * timeScale);
  }

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Movement integration
  const clock = new THREE.Clock();
  function updateMovement(deltaSeconds) {
    direction.set(0, 0, 0);
    if (keys.has('KeyW')) direction.z -= 1;
    if (keys.has('KeyS')) direction.z += 1;
    if (keys.has('KeyA')) direction.x -= 1;
    if (keys.has('KeyD')) direction.x += 1;
    direction.normalize();

    // Apply acceleration in camera space (XZ plane)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).negate();

    const accel = speedMetersPerSecond;
    velocity.add(forward.multiplyScalar(direction.z * accel * deltaSeconds));
    velocity.add(right.multiplyScalar(direction.x * accel * deltaSeconds));

    // Damping
    velocity.multiplyScalar(1 - Math.min(damping, 1) * deltaSeconds * 10);

    // Integrate position
    const move = velocity.clone().multiplyScalar(deltaSeconds);
    controls.moveRight(move.x);
    controls.moveForward(-move.z);

    // Keep on ground plane
    const pos = controls.getObject().position;
    pos.y = playerHeight + world.getGroundHeight(pos.x, pos.z);
  }

  // Main loop
  function frame() {
    const dt = clock.getDelta();
    updateMovement(dt);
    updateDayNight(dt);
    pickFarmTile();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);

  // Initial UI sync
  ui.updateSelectedSeed(farming.getSelectedSeed());
  ui.updateInventory(farming.getInventory());

  return { scene, camera, renderer };
})();

export default app;

