import * as THREE from '../vendor/three.module.js';

export const TRACK_POINTS = [
  [-18, 8], [-13, 7.4], [-8, 6.2], [-3.5, 4.2], [0.6, 2.2],
  [4.6, 0.4], [8.8, -1.4], [13, -4.3], [17, -7]
];

export const RIVER_POINTS = [
  [-4, -14], [-4.6, -9], [-3, -5], [-0.6, -1.4], [1.8, 2.4],
  [3.4, 7], [3, 13]
];

const palette = {
  baseTop: 0xCADFC3,
  baseSide: 0x9EBB9D,
  baseDark: 0x7E9C84,
  terraceTop: 0xD7E7CC,
  terraceSide: 0xA9C5A3,
  water: 0x8FC9D6,
  waterLight: 0xA9DDE5,
  bank: 0xB6CDB4,
  road: 0xD8DAD3,
  roadLine: 0xF4F1E7,
  cream: 0xF3E9D9,
  warmWhite: 0xFBF4E8,
  softPink: 0xE8ADA8,
  mutedPink: 0xD89B9B,
  slate: 0x8FAABF,
  deepSlate: 0x6D8AA1,
  sage: 0x9FBF9E,
  darkSage: 0x78A184,
  wood: 0xB48D72,
  darkWood: 0x8E705E,
  window: 0x6E96AC,
  windowLight: 0xA8CBD9,
  stone: 0xE4E2D7,
  stoneDark: 0xC4C8BD,
  flowerPink: 0xE4A6AE,
  flowerYellow: 0xEBCB86
};

function standard(color, roughness = 0.86, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addShadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function roundedRectShape(width, depth, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function createSlab(width, depth, height, topColor, sideColor, radius = 1.2) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, depth, radius), {
    depth: height,
    bevelEnabled: true,
    bevelSize: 0.35,
    bevelThickness: 0.28,
    bevelSegments: 2,
    curveSegments: 8,
    steps: 1
  });
  geometry.rotateX(-Math.PI / 2);
  const mesh = addShadow(new THREE.Mesh(geometry, [standard(topColor), standard(sideColor)]), false, true);
  return mesh;
}

function createBox(width, height, depth, color, x = 0, y = 0, z = 0, roughness = 0.86) {
  const mesh = addShadow(new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    standard(color, roughness)
  ));
  mesh.position.set(x, y, z);
  return mesh;
}

export function createRibbon(points, width, y, color, segments = 120, opacity = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const positions = [];
  const indices = [];
  const uvs = [];
  const normal = new THREE.Vector3();

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    normal.set(-tangent.z, 0, tangent.x).normalize();
    const left = point.clone().addScaledVector(normal, width / 2);
    const right = point.clone().addScaledVector(normal, -width / 2);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(t, 0, t, 1);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = standard(color);
  material.side = THREE.DoubleSide;
  material.transparent = opacity < 1;
  material.opacity = opacity;
  const mesh = addShadow(new THREE.Mesh(geometry, material), false, true);
  return mesh;
}

function createLabel(text, width = 3.4, height = 0.9) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFF9EC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#D29A99';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = '#A96C73';
  ctx.font = '700 58px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

function addEdges(mesh, color = 0xFFFFFF, opacity = 0.28) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 28),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  mesh.add(edges);
}

function createBuilding({
  x, z, width, depth, height,
  wall = palette.cream,
  roof = palette.slate,
  rotation = 0,
  level = 0,
  label = ''
}) {
  const group = new THREE.Group();
  group.position.set(x, level, z);
  group.rotation.y = rotation;

  const body = createBox(width, height, depth, wall, 0, height / 2, 0);
  addEdges(body);
  group.add(body);

  const roofHalfWidth = width / 2 + 0.45;
  const leftRoof = createBox(roofHalfWidth, 0.3, depth + 0.6, roof, -width / 4, height + 0.48, 0);
  const rightRoof = createBox(roofHalfWidth, 0.3, depth + 0.6, roof, width / 4, height + 0.48, 0);
  leftRoof.rotation.z = 0.38;
  rightRoof.rotation.z = -0.38;
  addEdges(leftRoof, 0xFFFFFF, 0.2);
  addEdges(rightRoof, 0xFFFFFF, 0.2);
  group.add(leftRoof, rightRoof);

  const frontZ = depth / 2 + 0.035;
  const sideX = width / 2 + 0.035;
  const windowMaterial = palette.window;
  const frontCount = width > 6 ? 3 : 2;
  for (let i = 0; i < frontCount; i += 1) {
    const wx = -width / 2 + (width / (frontCount + 1)) * (i + 1);
    const win = createBox(0.78, 0.78, 0.07, windowMaterial, wx, height * 0.62, frontZ);
    group.add(win);
  }
  group.add(createBox(0.72, 0.85, 0.07, windowMaterial, sideX, height * 0.62, -depth * 0.18));
  group.add(createBox(0.72, 0.85, 0.07, windowMaterial, sideX, height * 0.62, depth * 0.2));

  const door = createBox(0.9, 1.25, 0.09, palette.darkWood, 0, 0.64, frontZ);
  group.add(door);

  const step = createBox(1.4, 0.16, 0.7, palette.stone, 0, 0.08, frontZ + 0.38);
  group.add(step);

  if (label) {
    const sign = createLabel(label, 2.5, 0.62);
    sign.position.set(0, height - 0.45, frontZ + 0.02);
    group.add(sign);
  }

  return group;
}

function createTree(x, z, scale = 1, color = palette.darkSage) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  const trunk = addShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 1.1, 8),
    standard(palette.wood)
  ));
  trunk.position.y = 0.55;
  tree.add(trunk);

  const lower = addShadow(new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 1.7, 9),
    standard(color)
  ));
  lower.position.y = 1.65;
  tree.add(lower);

  const upper = addShadow(new THREE.Mesh(
    new THREE.ConeGeometry(0.78, 1.45, 9),
    standard(0x8DB994)
  ));
  upper.position.y = 2.6;
  tree.add(upper);

  return tree;
}

function createLamp(x, z, rotation = 0) {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0, z);
  lamp.rotation.y = rotation;
  lamp.add(createBox(0.14, 1.8, 0.14, palette.deepSlate, 0, 0.9, 0));
  lamp.add(createBox(0.65, 0.12, 0.18, palette.deepSlate, 0.26, 1.78, 0));
  const bulb = addShadow(new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    standard(0xFFE6A8, 0.5)
  ));
  bulb.position.set(0.52, 1.7, 0);
  lamp.add(bulb);
  return lamp;
}

function createFlowerPatch(x, z, count = 8, spread = 1.2) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stemMaterial = standard(palette.darkSage);
  const flowerMaterials = [standard(palette.flowerPink), standard(palette.flowerYellow), standard(palette.warmWhite)];
  const stemGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.32, 5);
  const flowerGeometry = new THREE.IcosahedronGeometry(0.11, 0);

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = spread * (0.35 + (i % 3) * 0.22);
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.set(px, 0.16, pz);
    const flower = new THREE.Mesh(flowerGeometry, flowerMaterials[i % flowerMaterials.length]);
    flower.position.set(px, 0.36, pz);
    group.add(stem, flower);
  }
  return group;
}

function createStation(scene) {
  const group = new THREE.Group();
  group.position.set(7.6, 0, 1.8);
  group.rotation.y = -0.28;

  const platform = createBox(10.5, 0.36, 3.2, palette.stone, 0, 0.18, 0);
  addEdges(platform, 0xFFFFFF, 0.35);
  group.add(platform);
  group.add(createBox(10.5, 0.12, 0.22, palette.mutedPink, 0, 0.42, 1.5));

  const stationBuilding = createBuilding({
    x: 0,
    z: -2.5,
    width: 7.2,
    depth: 3.4,
    height: 3.1,
    wall: palette.warmWhite,
    roof: palette.mutedPink,
    rotation: 0,
    label: '插画站'
  });
  group.add(stationBuilding);

  const canopy = createBox(8.2, 0.18, 2.1, palette.slate, 0.4, 2.35, 0.5);
  addEdges(canopy, 0xFFFFFF, 0.3);
  group.add(canopy);
  [-3.2, 0.3, 3.8].forEach((x) => {
    group.add(createBox(0.14, 2.1, 0.14, palette.deepSlate, x, 1.27, 1.3));
  });

  const bench = new THREE.Group();
  bench.add(createBox(1.5, 0.12, 0.42, palette.wood, 0, 0.58, 0));
  bench.add(createBox(1.5, 0.42, 0.1, palette.darkWood, 0, 0.81, -0.2));
  bench.add(createBox(0.1, 0.55, 0.1, palette.deepSlate, -0.6, 0.3, 0));
  bench.add(createBox(0.1, 0.55, 0.1, palette.deepSlate, 0.6, 0.3, 0));
  bench.position.set(-3.4, 0.36, 0.4);
  group.add(bench);

  scene.add(group);
}

function createBridge(root) {
  const bridge = new THREE.Group();
  bridge.position.set(0.5, 0, 2.3);
  bridge.rotation.y = -0.62;
  bridge.add(createBox(3.6, 0.28, 5.4, palette.wood, 0, 0.12, 0));
  bridge.add(createBox(3.9, 0.12, 0.18, palette.darkWood, 0, 0.34, 2.6));
  bridge.add(createBox(3.9, 0.12, 0.18, palette.darkWood, 0, 0.34, -2.6));
  [-2.1, 2.1].forEach((z) => {
    bridge.add(createBox(0.16, 0.85, 0.16, palette.darkWood, -1.65, 0.75, z));
    bridge.add(createBox(0.16, 0.85, 0.16, palette.darkWood, 1.65, 0.75, z));
  });
  [-2.1, 0, 2.1].forEach((z) => {
    bridge.add(createBox(0.5, 1.1, 0.5, palette.stoneDark, -1.25, -0.35, z));
    bridge.add(createBox(0.5, 1.1, 0.5, palette.stoneDark, 1.25, -0.35, z));
  });
  root.add(bridge);
}

export function createWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);

  const base = createSlab(38, 27, 2.35, palette.baseTop, palette.baseSide, 2.2);
  base.position.y = -2.35;
  root.add(base);

  const lowerBase = createSlab(38.8, 27.8, 0.55, palette.baseDark, palette.baseDark, 2.4);
  lowerBase.position.y = -2.9;
  root.add(lowerBase);

  const terraceA = createSlab(13, 8.2, 1.15, palette.terraceTop, palette.terraceSide, 1.4);
  terraceA.position.set(10.7, 0, -8.2);
  root.add(terraceA);

  const terraceB = createSlab(9.5, 6.5, 0.72, 0xD8E8C9, 0xA6C39F, 1.2);
  terraceB.position.set(-11.5, 0, -8.7);
  root.add(terraceB);

  root.add(createRibbon(RIVER_POINTS, 5.4, 0.035, palette.bank, 140));
  root.add(createRibbon(RIVER_POINTS, 4.2, 0.075, palette.water, 140, 0.95));
  root.add(createRibbon(RIVER_POINTS, 2.7, 0.1, palette.waterLight, 140, 0.42));

  const roadA = [[-17, -2], [-12, -1], [-7, 0], [-2, 1], [3, 2], [8, 3], [14, 2], [18, 0]];
  root.add(createRibbon(roadA, 2.4, 0.025, palette.road, 120));
  const roadB = [[-13, -12], [-10, -7], [-8, -2], [-7, 4], [-8, 10]];
  root.add(createRibbon(roadB, 1.8, 0.025, palette.road, 90));

  createBridge(root);
  createStation(root);

  const buildings = [
    createBuilding({ x: 12, z: -8.2, width: 6.4, depth: 4.2, height: 4.2, wall: 0xEFE1D0, roof: palette.slate, level: 1.15, label: '角色工坊' }),
    createBuilding({ x: 7.2, z: -9.3, width: 4.8, depth: 3.6, height: 3.2, wall: 0xE9D8CC, roof: palette.deepSlate, level: 1.15 }),
    createBuilding({ x: -11.8, z: -8.7, width: 5.2, depth: 3.8, height: 3.6, wall: palette.warmWhite, roof: palette.sage, level: 0.72 }),
    createBuilding({ x: -12.5, z: 4.5, width: 5.8, depth: 4.1, height: 3.4, wall: 0xF0E4D7, roof: palette.mutedPink, rotation: 0.18 }),
    createBuilding({ x: 5.5, z: 8.4, width: 5.4, depth: 4, height: 3.1, wall: palette.warmWhite, roof: palette.slate, rotation: -0.24 }),
    createBuilding({ x: 14.2, z: 7.3, width: 4.6, depth: 3.5, height: 2.8, wall: 0xE7DED2, roof: palette.sage, rotation: 0.32 })
  ];
  buildings.forEach((building) => root.add(building));

  const treePositions = [
    [-16, -9, 1.1], [-14.5, -6.5, .85], [-5, -9.8, .9], [-2, -11.5, 1.05],
    [1.8, -7.2, .78], [15.3, -3.8, .92], [16.2, 2.5, .8], [12.8, 10.5, 1.05],
    [8.8, 12, .82], [-1.5, 10.8, .95], [-5.8, 8.4, .7], [-16.2, 10.8, .88],
    [-8.2, -1.8, .7], [11.4, 5.2, .65], [14.8, -11.2, .7], [0.8, 6.8, .58]
  ];
  treePositions.forEach(([x, z, scale], index) => {
    root.add(createTree(x, z, scale, index % 3 === 0 ? 0x7FA98D : palette.darkSage));
  });

  [
    [-15.5, 0.8, 0.2], [-9.5, 2.4, 0.5], [-6.2, 9.8, 0], [2.2, -9.5, 0.4],
    [10.2, -1.8, 0.1], [15.8, 9.1, 0.8], [5.8, 5.8, 0.3]
  ].forEach(([x, z, rotation]) => root.add(createLamp(x, z, rotation)));

  [
    [-14.5, 7.8], [-10.5, 9.5], [-5.5, 5.8], [1.8, 8.2], [10.5, 9.8],
    [15.5, 3.8], [12.8, -5.8], [-15.2, -4.5], [-8.5, -11.2]
  ].forEach(([x, z], index) => root.add(createFlowerPatch(x, z, 7 + (index % 3), 0.8 + index % 2 * 0.3)));

  return root;
}
