import * as THREE from '../vendor/three.module.js';
import { createWorld } from './world.js';
import { createRailway } from './railway.js';

const container = document.getElementById('scene');
const fallback = document.getElementById('sceneFallback');

function init() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xDDEFF6);

  const camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 200);
  const target = new THREE.Vector3(0, 0.8, 0);
  const view = { azimuth: 0.78, polar: 0.88, radius: 52, zoom: 1.16 };

  function updateCamera() {
    const spread = Math.sin(view.polar);
    camera.position.set(
      target.x + view.radius * spread * Math.sin(view.azimuth),
      target.y + view.radius * Math.cos(view.polar),
      target.z + view.radius * spread * Math.cos(view.azimuth)
    );
    camera.lookAt(target);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xE9F7FF, 0xB6C3A9, 1.65);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xFFF3E4, 2.45);
  sunLight.position.set(-16, 26, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -30;
  sunLight.shadow.camera.right = 30;
  sunLight.shadow.camera.top = 30;
  sunLight.shadow.camera.bottom = -30;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 80;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xBED9E8, 0.55);
  fillLight.position.set(18, 12, -20);
  scene.add(fillLight);

  createWorld(scene);
  const railway = createRailway(scene);

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / Math.max(height, 1);
    const frustum = 26;
    camera.left = -frustum * aspect / 2;
    camera.right = frustum * aspect / 2;
    camera.top = frustum / 2;
    camera.bottom = -frustum / 2;
    camera.zoom = view.zoom;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    updateCamera();
  }

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;

  container.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    container.classList.add('is-dragging');
    container.setPointerCapture(event.pointerId);
  });

  container.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 6) moved = true;
    view.azimuth -= dx * 0.006;
    view.polar = THREE.MathUtils.clamp(view.polar + dy * 0.004, 0.55, 1.08);
    updateCamera();
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('is-dragging');
    if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    if (!moved) handleSceneClick(event.clientX, event.clientY);
  }

  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function handleSceneClick(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children, true).find((item) => item.object.visible);
    if (!hit) return;
    const { x, z } = hit.point;
    let targetId = null;
    if (x > 2.5 && x < 13 && z > -3 && z < 5) targetId = 'illustration';
    if (x < -7 && z < -5) targetId = 'three';
    if (x > 3 && z > 5.5) targetId = 'motion';
    if (targetId) {
      const section = document.getElementById(targetId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }
  }

  container.addEventListener('wheel', (event) => {
    event.preventDefault();
    view.zoom = THREE.MathUtils.clamp(view.zoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.72, 1.7);
    camera.zoom = view.zoom;
    camera.updateProjectionMatrix();
  }, { passive: false });

  window.addEventListener('resize', resize);
  resize();

  function animate(time) {
    railway.update(time);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

try {
  init();
} catch (error) {
  fallback.hidden = false;
  console.error(error);
}
