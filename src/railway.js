import * as THREE from '../vendor/three.module.js';
import { TRACK_POINTS, createRibbon } from './world.js';

const trackMaterials = {
  ballast: 0xB9B9AC,
  sleeper: 0x8E6F5C,
  rail: 0x6B8498,
  locoBody: 0xE9A5A3,
  locoRoof: 0x7FA6C9,
  carPink: 0xE7B0AA,
  carMint: 0x9DBE9E,
  cream: 0xF8EFDF,
  window: 0x6D93A9,
  wheel: 0x5C7180,
  metal: 0x7F909A,
  lamp: 0xFFE3A0
};

function standard(color, roughness = 0.82, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(width, height, depth, color, x = 0, y = 0, z = 0, roughness = 0.82) {
  const mesh = addShadow(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), standard(color, roughness)));
  mesh.position.set(x, y, z);
  return mesh;
}

function wheel(x, z, radius = 0.3) {
  const mesh = addShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.16, 14),
    standard(trackMaterials.wheel, 0.55, 0.25)
  ));
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, radius, z);
  return mesh;
}

function createWindows(group, width, height, depth, color) {
  [-1, 1].forEach((side) => {
    [-depth * 0.22, depth * 0.2].forEach((z) => {
      const window = box(0.07, 0.62, 0.7, color, side * (width / 2 + 0.035), height * 0.66, z, 0.45);
      group.add(window);
    });
  });
}

function createLocomotive() {
  const group = new THREE.Group();
  group.scale.setScalar(0.92);

  group.add(box(1.8, 0.45, 4.2, trackMaterials.metal, 0, 0.62, 0, 0.5));
  group.add(box(1.7, 0.62, 4.0, trackMaterials.locoBody, 0, 0.94, 0));

  const boiler = addShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 2.35, 18),
    standard(trackMaterials.locoBody, 0.78)
  ));
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(0, 1.45, 0.55);
  group.add(boiler);

  group.add(box(1.92, 1.55, 1.65, trackMaterials.cream, 0, 1.55, -1.28));
  group.add(box(2.08, 0.22, 1.82, trackMaterials.locoRoof, 0, 2.45, -1.28));
  group.add(box(0.72, 0.58, 0.08, trackMaterials.window, 0, 1.78, -0.44, 0.45));

  [-1, 1].forEach((side) => {
    group.add(box(0.08, 0.6, 0.72, trackMaterials.window, side * 0.98, 1.66, -1.3, 0.45));
  });

  const chimney = addShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.78, 12),
    standard(trackMaterials.metal, 0.5, 0.2)
  ));
  chimney.position.set(0, 2.22, 1.32);
  group.add(chimney);

  const lamp = addShadow(new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshBasicMaterial({ color: trackMaterials.lamp })
  ));
  lamp.position.set(0, 1.42, 2.06);
  group.add(lamp);

  [-1.45, -0.2, 1.35].forEach((z) => {
    group.add(wheel(-0.92, z));
    group.add(wheel(0.92, z));
  });

  const steam = [];
  const steamGeometry = new THREE.SphereGeometry(0.22, 10, 8);
  for (let i = 0; i < 6; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xF7F4EC,
      roughness: 1,
      transparent: true,
      opacity: 0.5
    });
    const puff = new THREE.Mesh(steamGeometry, material);
    puff.position.set(0, 2.5, 1.3);
    group.add(puff);
    steam.push(puff);
  }
  group.userData.steam = steam;

  return group;
}

function createCarriage(bodyColor, roofColor) {
  const group = new THREE.Group();
  group.scale.setScalar(0.92);

  group.add(box(1.75, 0.38, 3.55, trackMaterials.metal, 0, 0.58, 0, 0.5));
  group.add(box(1.68, 1.08, 3.25, bodyColor, 0, 1.18, 0));
  group.add(box(1.86, 0.22, 3.45, roofColor, 0, 1.82, 0));
  createWindows(group, 1.68, 1.08, 3.25, trackMaterials.window);

  [-1.05, 1.05].forEach((z) => {
    group.add(wheel(-0.88, z, 0.27));
    group.add(wheel(0.88, z, 0.27));
  });

  return group;
}

function offsetCurve(curve, offset, y) {
  const points = [];
  const normal = new THREE.Vector3();
  for (let i = 0; i <= 90; i += 1) {
    const t = i / 90;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    normal.set(-tangent.z, 0, tangent.x).normalize();
    points.push(point.clone().addScaledVector(normal, offset).setY(y));
  }
  return new THREE.CatmullRomCurve3(points);
}

export function createRailway(scene) {
  const curve = new THREE.CatmullRomCurve3(
    TRACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z))
  );

  const ballast = createRibbon(TRACK_POINTS, 2.8, 0.18, trackMaterials.ballast, 160);
  scene.add(ballast);

  const sleeperCount = 58;
  const sleeperGeometry = new THREE.BoxGeometry(2.05, 0.13, 0.42);
  const sleeperMaterial = standard(trackMaterials.sleeper, 0.9);
  const sleepers = new THREE.InstancedMesh(sleeperGeometry, sleeperMaterial, sleeperCount);
  sleepers.castShadow = true;
  sleepers.receiveShadow = true;
  const dummy = new THREE.Object3D();

  for (let i = 0; i < sleeperCount; i += 1) {
    const t = (i + 0.5) / sleeperCount;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    dummy.position.set(point.x, 0.31, point.z);
    dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  scene.add(sleepers);

  const railMaterial = standard(trackMaterials.rail, 0.35, 0.45);
  [-0.76, 0.76].forEach((offset) => {
    const railCurve = offsetCurve(curve, offset, 0.43);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 180, 0.06, 6, false), railMaterial);
    rail.castShadow = true;
    scene.add(rail);
  });

  const locomotive = createLocomotive();
  const carriageOne = createCarriage(trackMaterials.carPink, trackMaterials.cream);
  const carriageTwo = createCarriage(trackMaterials.carMint, trackMaterials.cream);
  const units = [locomotive, carriageOne, carriageTwo];
  units.forEach((unit) => scene.add(unit));

  function update(time) {
    const wave = Math.sin(time * 0.00018 - Math.PI / 2);
    const progress = 0.08 + (wave * 0.5 + 0.5) * 0.84;
    const movingForward = Math.cos(time * 0.00018) >= 0;
    const direction = movingForward ? 0.006 : -0.006;
    const offsets = [0, 0.055, 0.11];

    units.forEach((unit, index) => {
      const t = THREE.MathUtils.clamp(progress - offsets[index], 0.01, 0.99);
      const point = curve.getPointAt(t);
      const target = curve.getPointAt(THREE.MathUtils.clamp(t + direction, 0, 1));
      unit.position.set(point.x, 0.42, point.z);
      unit.lookAt(target.x, 0.42, target.z);
    });

    locomotive.userData.steam.forEach((puff, index) => {
      const phase = ((time * 0.00035 + index / 6) % 1);
      puff.position.set(0, 2.45 + phase * 1.5, 1.3 - phase * 1.7);
      puff.scale.setScalar(0.55 + phase * 0.9);
      puff.material.opacity = 0.46 * (1 - phase);
    });
  }

  return { update, curve, units };
}
