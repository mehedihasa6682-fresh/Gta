import * as THREE from 'three';
import {
  createDhakaAsphaltTexture,
  createDhakaBuildingTexture,
  createDhakaCurbStripeTexture,
  createDhakaSidewalkTexture,
} from './textures';
import {
  ColliderBox,
  GpsTarget,
  MinimapBuilding,
  MinimapRoad,
  PropertySpec,
  RobberySpot,
  StreetZone,
  TimePreset,
  TurfZone,
  VehicleSpec,
} from './types';

export interface CityWorld {
  colliders: ColliderBox[];
  streetZones: StreetZone[];
  minimapBuildings: MinimapBuilding[];
  minimapRoads: MinimapRoad[];
  robberySpots: RobberySpot[];
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  fillLight: THREE.DirectionalLight;
  updateLighting: (preset: TimePreset) => void;
  dispose: () => void;
}

export const INITIAL_VEHICLES: VehicleSpec[] = [
  {
    id: 'veh-suv',
    name: 'Toyota Prado TG-Spec',
    kind: 'suv',
    color: 0x161b24,
    x: -4.4,
    z: 7,
    rotationY: 0.08,
    maxSpeed: 34,
    accel: 17,
    handling: 2.35,
  },
  {
    id: 'veh-cng-1',
    name: 'Dhaka Metro CNG',
    kind: 'cng',
    color: 0x15803d,
    x: 4.5,
    z: -12,
    rotationY: Math.PI,
    maxSpeed: 24,
    accel: 15,
    handling: 2.9,
  },
  {
    id: 'veh-coupe',
    name: 'Nissan GT-R Redline',
    kind: 'coupe',
    color: 0x991b1b,
    x: -44,
    z: -11,
    rotationY: Math.PI / 2,
    maxSpeed: 44,
    accel: 23,
    handling: 2.7,
  },
  {
    id: 'veh-police',
    name: 'DMP Patrol Cruiser',
    kind: 'police',
    color: 0x0f172a,
    x: 42,
    z: 18,
    rotationY: -Math.PI / 2,
    maxSpeed: 39,
    accel: 21,
    handling: 2.55,
  },
  // Autonomous AI Traffic Vehicles cruising Dhaka roads
  {
    id: 'ai-cng-1',
    name: 'Dhaka CNG-241',
    kind: 'cng',
    color: 0x16a34a,
    x: 4.8,
    z: 45,
    rotationY: Math.PI,
    maxSpeed: 14,
    accel: 10,
    handling: 2.5,
    aiDriven: true,
    aiLaneAxis: 'z',
    aiLaneCoord: 4.8,
    aiDir: -1,
  },
  {
    id: 'ai-sedan-1',
    name: 'Toyota Allion Silver',
    kind: 'sedan',
    color: 0x94a3b8,
    x: -4.8,
    z: -48,
    rotationY: 0,
    maxSpeed: 16,
    accel: 11,
    handling: 2.3,
    aiDriven: true,
    aiLaneAxis: 'z',
    aiLaneCoord: -4.8,
    aiDir: 1,
  },
  {
    id: 'ai-cng-2',
    name: 'Dhaka CNG-809',
    kind: 'cng',
    color: 0x15803d,
    x: -50,
    z: 4.6,
    rotationY: Math.PI / 2,
    maxSpeed: 13,
    accel: 10,
    handling: 2.5,
    aiDriven: true,
    aiLaneAxis: 'x',
    aiLaneCoord: 4.6,
    aiDir: 1,
  },
  {
    id: 'veh-ambulance',
    name: 'Dhaka Medical Ambulance',
    kind: 'ambulance',
    color: 0xf8fafc,
    x: 6.2,
    z: 38,
    rotationY: 0,
    maxSpeed: 33,
    accel: 16,
    handling: 2.3,
  },
  {
    id: 'ai-police-1',
    name: 'DMP Gulshan Unit',
    kind: 'police',
    color: 0x0f172a,
    x: 55,
    z: -4.6,
    rotationY: -Math.PI / 2,
    maxSpeed: 17,
    accel: 12,
    handling: 2.5,
    aiDriven: true,
    aiLaneAxis: 'x',
    aiLaneCoord: -4.6,
    aiDir: -1,
  },
];

export const DHAKA_CUSTOMS_POS = {
  x: -13.8,
  z: -23.5,
  name: 'Dhaka Customs (LS Tuning)',
};

export const INITIAL_PROPERTIES: PropertySpec[] = [
  {
    id: 'prop-banani',
    name: 'Banani Lakeview Studio',
    district: 'Banani Rd 11',
    price: 45000,
    garageSlots: 2,
    hasHeistRoom: false,
    x: -15.2,
    z: -58,
    owned: false,
  },
  {
    id: 'prop-gulshan',
    name: 'Gulshan 2 High-End Penthouse',
    district: 'Gulshan Ave',
    price: 120000,
    garageSlots: 10,
    hasHeistRoom: true,
    x: 15.2,
    z: -18,
    owned: false,
  },
  {
    id: 'prop-dhanmondi',
    name: 'Dhanmondi Executive Duplex',
    district: 'Dhanmondi 27',
    price: 185000,
    garageSlots: 10,
    hasHeistRoom: true,
    x: -54,
    z: -14,
    owned: false,
  },
];

export const GPS_LOCATIONS: GpsTarget[] = [
  { id: 'gps-customs', name: 'Dhaka Customs Mod Shop', x: -13.8, z: -23.5 },
  { id: 'gps-gulshan-apt', name: 'Gulshan Penthouse (Dynasty 8)', x: 15.2, z: -18 },
  { id: 'gps-medical', name: 'Dhaka Medical Hospital', x: 15.2, z: 38 },
  { id: 'gps-bank', name: 'Dhaka Bank Vault (Heist)', x: 15.2, z: -38 },
  { id: 'gps-swapno', name: 'Swapno SuperShop', x: -15.2, z: 38 },
  { id: 'gps-tong', name: 'Gulshan Tea Tong', x: -14.2, z: -14 },
  { id: 'gps-ammu', name: 'Ammu-Nation Dhaka', x: -14.2, z: -36 },
  { id: 'gps-thana', name: 'DMP Gulshan Thana', x: 46, z: 40 },
];

export const INITIAL_TURF_ZONES: TurfZone[] = [
  { id: 'turf-gulshan', name: 'Gulshan Circle TG HQ', x: 0, z: 0, radius: 10, owner: 'TG', reward: 5000 },
  { id: 'turf-banani', name: 'Banani Rd 11 Turf', x: 0, z: -82, radius: 11, owner: 'RIVAL', reward: 8500 },
  { id: 'turf-motijheel', name: 'Motijheel C/A Turf', x: 0, z: 82, radius: 11, owner: 'RIVAL', reward: 9500 },
  { id: 'turf-dhanmondi', name: 'Dhanmondi 27 Turf', x: -92, z: 0, radius: 11, owner: 'RIVAL', reward: 10500 },
];

export const STREET_ZONES: StreetZone[] = [
  { name: 'Gulshan Ave', postal: '1212', minX: -24, maxX: 24, minZ: -60, maxZ: 60 },
  { name: 'Banani Rd 11', postal: '1213', minX: -24, maxX: 24, minZ: -160, maxZ: -60 },
  { name: 'Dhanmondi 27', postal: '1209', minX: -160, maxX: -24, minZ: -35, maxZ: 35 },
  { name: 'Mirpur Rd', postal: '1207', minX: 24, maxX: 160, minZ: -35, maxZ: 35 },
  { name: 'Motijheel C/A', postal: '1000', minX: -160, maxX: 160, minZ: 60, maxZ: 160 },
];

export function buildDhakaWorld(
  scene: THREE.Scene,
  maxAnisotropy: number
): CityWorld {
  const disposables: { dispose: () => void }[] = [];
  const colliders: ColliderBox[] = [];
  const minimapBuildings: MinimapBuilding[] = [];
  const minimapRoads: MinimapRoad[] = [];

  // 1. Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x3f4e3c, 0.76);
  hemiLight.position.set(0, 80, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
  sunLight.position.set(48, 76, 36);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 220;
  const d = 80;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.025;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.35);
  fillLight.position.set(-40, 28, -35);
  scene.add(fillLight);

  // 2. Ground & Tropical Bengal Soil/Turf Terrain
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3d4d35,
    roughness: 0.95,
    metalness: 0.02,
  });
  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.02;
  groundPlane.receiveShadow = true;
  scene.add(groundPlane);
  disposables.push(groundMat, groundPlane.geometry);

  // Dhaka Road & Footpath Textures
  const asphaltNS = createDhakaAsphaltTexture(maxAnisotropy, 1, 26);
  const asphaltEW = createDhakaAsphaltTexture(maxAnisotropy, 1, 26);
  const sidewalkTex = createDhakaSidewalkTexture(maxAnisotropy);
  const curbTex = createDhakaCurbStripeTexture(maxAnisotropy);
  disposables.push(asphaltNS, asphaltEW, sidewalkTex, curbTex);

  const roadMatNS = new THREE.MeshStandardMaterial({ map: asphaltNS, roughness: 0.84, metalness: 0.04 });
  const roadMatEW = new THREE.MeshStandardMaterial({ map: asphaltEW, roughness: 0.84, metalness: 0.04 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.88, metalness: 0.02 });
  const curbStripeMat = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.8 });
  disposables.push(roadMatNS, roadMatEW, sidewalkMat, curbStripeMat);

  // Gulshan Ave / Banani Main N-S Boulevard (wide 18m road with black-white Dhaka median divider)
  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(18, 290), roadMatNS);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.y = 0.01;
  mainRoad.receiveShadow = true;
  scene.add(mainRoad);
  minimapRoads.push({ x: 0, z: 0, w: 18, d: 290 });
  disposables.push(mainRoad.geometry);

  // Dhaka Black-White Striped Concrete Median Dividers (North & South segments leaving central intersection clear)
  for (const mz of [-48, 48]) {
    const median = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 62), curbStripeMat);
    median.position.set(0, 0.12, mz);
    median.castShadow = true;
    median.receiveShadow = true;
    scene.add(median);
    minimapRoads.push({ x: 0, z: mz, w: 1, d: 62, isDivider: true });
    disposables.push(median.geometry);
  }

  // Footpaths along Gulshan Ave
  for (const sx of [-12.5, 12.5]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 290), sidewalkMat);
    sw.position.set(sx, 0.05, 0);
    sw.receiveShadow = true;
    scene.add(sw);
    disposables.push(sw.geometry);
  }

  // Intersecting Dhanmondi 27 - Mirpur Rd (E-W) + Motijheel Ring
  for (const az of [0, -82, 82]) {
    const avenue = new THREE.Mesh(new THREE.PlaneGeometry(290, 17), roadMatEW);
    avenue.rotation.x = -Math.PI / 2;
    avenue.rotation.z = Math.PI / 2;
    avenue.position.set(0, az === 0 ? 0.025 : 0.015, az);
    avenue.receiveShadow = true;
    scene.add(avenue);
    minimapRoads.push({ x: 0, z: az, w: 290, d: 17 });
    disposables.push(avenue.geometry);
  }

  // Outer ring roads
  for (const ax of [-92, 92]) {
    const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(14, 240), roadMatNS);
    sideRoad.rotation.x = -Math.PI / 2;
    sideRoad.position.set(ax, 0.01, 0);
    sideRoad.receiveShadow = true;
    scene.add(sideRoad);
    minimapRoads.push({ x: ax, z: 0, w: 14, d: 240 });
    disposables.push(sideRoad.geometry);
  }

  // 3. Bangladeshi Apartment Blocks, Banks, Police Box & Rooftop Water Tanks
  const brickFacadeTex = createDhakaBuildingTexture('#9b4d3c', '#cbd5e1', true, true, maxAnisotropy);
  const concreteCreamTex = createDhakaBuildingTexture('#d6d3cd', '#94a3b8', false, false, maxAnisotropy);
  const commercialGlassTex = createDhakaBuildingTexture('#334155', '#0f172a', false, true, maxAnisotropy);
  const pastelMintTex = createDhakaBuildingTexture('#9ec5b8', '#e2e8f0', false, true, maxAnisotropy);
  disposables.push(brickFacadeTex, concreteCreamTex, commercialGlassTex, pastelMintTex);

  const tankMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.1 });
  const stairRoomMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 });
  const roofFloorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
  disposables.push(tankMat, stairRoomMat, roofFloorMat);

  const awningMatTeal = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.65 });
  const awningMatRed = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 });
  const grillRailMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.45 });
  disposables.push(awningMatTeal, awningMatRed, grillRailMat);

  const buildDhakaBuilding = (
    x: number,
    z: number,
    w: number,
    h: number,
    dLen: number,
    tex: THREE.Texture,
    mapColor: string,
    label?: string,
    addFrontDetail = false
  ) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);

    const wallMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.04 });
    disposables.push(wallMat);

    const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, dLen), wallMat);
    main.position.y = h / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    bGroup.add(main);

    // 3D Protruding Dhaka Apartment Balconies (বারান্দা) & Ground Shop Awnings (ছাউনি)
    if (addFrontDetail) {
      const faceSign = x < 0 ? 1 : -1;
      const frontX = faceSign * (w / 2);

      // Ground floor continuous shop sunshade awning
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 0.14, dLen * 0.88),
        x < 0 ? awningMatTeal : awningMatRed
      );
      awning.position.set(frontX + faceSign * 0.65, 3.65, 0);
      awning.rotation.z = faceSign * -0.18;
      awning.castShadow = true;
      bGroup.add(awning);
      disposables.push(awning.geometry);

      // Multi-floor protruding concrete balconies with iron railings
      const floors = Math.min(4, Math.floor((h - 4) / 4));
      for (let f = 1; f <= floors; f++) {
        const by = 3.8 + f * 3.8;
        if (by > h - 1.5) break;
        for (const bz of [-dLen * 0.28, dLen * 0.28]) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.2, 6.2), stairRoomMat);
          slab.position.set(frontX + faceSign * 0.55, by, bz);
          slab.castShadow = true;
          bGroup.add(slab);

          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 6.1), grillRailMat);
          rail.position.set(frontX + faceSign * 1.08, by + 0.52, bz);
          bGroup.add(rail);
          disposables.push(slab.geometry, rail.geometry);
        }
      }
    }

    // Rooftop parapet rim
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.8, dLen + 0.4), roofFloorMat);
    parapet.position.y = h + 0.4;
    parapet.castShadow = true;
    bGroup.add(parapet);

    // Classic Dhaka rooftop Chilikotha (stairwell penthouse)
    const stairRoom = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, 2.8, dLen * 0.24), stairRoomMat);
    stairRoom.position.set(-w * 0.22, h + 1.4, -dLen * 0.22);
    stairRoom.castShadow = true;
    bGroup.add(stairRoom);

    // Iconic Bangladeshi black cylindrical rooftop water tanks (2 per apartment)
    for (const tx of [w * 0.16, w * 0.28]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.9, 12), tankMat);
      tank.position.set(tx, h + 1.4, dLen * 0.18);
      tank.castShadow = true;
      bGroup.add(tank);
      disposables.push(tank.geometry);
    }

    scene.add(bGroup);
    colliders.push({
      minX: x - w / 2 - 0.3,
      maxX: x + w / 2 + 0.3,
      minZ: z - dLen / 2 - 0.3,
      maxZ: z + dLen / 2 + 0.3,
      label,
    });
    minimapBuildings.push({ x, z, w, d: dLen, color: mapColor, label });
    disposables.push(main.geometry, parapet.geometry, stairRoom.geometry);
  };

  // Gulshan Ave & Dhanmondi Core Buildings (with 3D balconies & shop awnings)
  buildDhakaBuilding(-28, -38, 22, 18, 38, brickFacadeTex, '#b45309', 'Ammu-Nation & Flats', true);
  buildDhakaBuilding(-28, 38, 22, 20, 38, pastelMintTex, '#64748b', 'Swapno SuperShop', true);
  buildDhakaBuilding(28, -38, 22, 24, 38, commercialGlassTex, '#14b8a6', 'Dhaka Bank Vault', true);
  buildDhakaBuilding(28, 38, 22, 17, 38, concreteCreamTex, '#ef4444', 'Dhaka Medical', true);

  // Dhaka Medical Emergency Entrance Canopy, Pillars, Bench & Glowing Red Cross Sign
  const medCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.25, 10),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
  );
  medCanopy.position.set(15.2, 3.35, 38);
  medCanopy.castShadow = true;
  scene.add(medCanopy);

  for (const pz of [33.5, 42.5]) {
    const colPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.3, 10), stairRoomMat);
    colPillar.position.set(13.8, 1.65, pz);
    colPillar.castShadow = true;
    scene.add(colPillar);
    disposables.push(colPillar.geometry);
  }

  // Hospital Waiting Bench outside entrance
  const medBench = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
  );
  medBench.position.set(15.6, 0.34, 41.2);
  medBench.castShadow = true;
  scene.add(medBench);

  const redCrossMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xdc2626,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.8, 0.55), redCrossMat);
  crossV.position.set(16.7, 6.2, 38);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 1.8), redCrossMat);
  crossH.position.set(16.7, 6.2, 38);
  scene.add(crossV, crossH);
  disposables.push(medCanopy.geometry, medBench.geometry, crossV.geometry, crossH.geometry, redCrossMat);

  // Outer Dhaka blocks
  buildDhakaBuilding(-62, -40, 26, 26, 40, concreteCreamTex, '#475569');
  buildDhakaBuilding(-62, 40, 26, 19, 40, brickFacadeTex, '#7c2d12');
  buildDhakaBuilding(62, -40, 26, 22, 40, brickFacadeTex, '#7c2d12');
  buildDhakaBuilding(62, 40, 26, 16, 40, commercialGlassTex, '#3b82f6', 'DMP Gulshan Thana');

  // Motijheel & Banani Skyline Towers
  const towers: [number, number, number, number, number][] = [
    [-46, -118, 28, 46, 28],
    [46, -118, 30, 54, 30],
    [-46, 118, 28, 38, 28],
    [46, 118, 30, 44, 30],
  ];
  for (const [tx, tz, tw, th, td] of towers) {
    buildDhakaBuilding(tx, tz, tw, th, td, commercialGlassTex, '#334155');
  }

  // 4. Roadside Dhaka Tong Tea Stall (টং চায়ের দোকান) & DMP Traffic Police Box
  const tinMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.48, metalness: 0.45 });
  const woodBenchMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.88 });
  const stallBodyMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
  disposables.push(tinMat, woodBenchMat, stallBodyMat);

  const buildTongStall = (x: number, z: number) => {
    const stall = new THREE.Group();
    stall.position.set(x, 0.12, z);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 1.8), stallBodyMat);
    counter.position.y = 0.55;
    counter.castShadow = true;
    stall.add(counter);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 2.5), tinMat);
    roof.position.y = 2.4;
    roof.rotation.z = 0.08;
    roof.castShadow = true;
    stall.add(roof);

    for (const px of [-1.3, 1.3]) {
      for (const pz of [-0.8, 0.8]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), woodBenchMat);
        post.position.set(px, 1.2, pz);
        stall.add(post);
      }
    }

    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.55), woodBenchMat);
    bench.position.set(0, 0.22, 1.45);
    bench.castShadow = true;
    stall.add(bench);

    scene.add(stall);
    colliders.push({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 1.1, maxZ: z + 1.1, label: 'Tea Tong' });
  };
  buildTongStall(-14.2, -14);
  buildTongStall(14.2, 22);

  // DMP Traffic Police Box at main Gulshan intersection
  const policeBox = new THREE.Group();
  policeBox.position.set(13.5, 0.12, -13.5);
  const pBoxWall = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.6, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 })
  );
  pBoxWall.position.y = 1.3;
  pBoxWall.castShadow = true;
  const pBoxStripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.46, 0.45, 2.46),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 })
  );
  pBoxStripe.position.y = 1.9;
  policeBox.add(pBoxWall, pBoxStripe);
  scene.add(policeBox);
  colliders.push({ minX: 12.2, maxX: 14.8, minZ: -14.8, maxZ: -12.2, label: 'DMP Police Box' });

  // 5. Realistic Bangladeshi Trees: Krishnochura (কৃষ্ণচূড়া), Mango/Banyan (আম/বট), Coconut (নারিকেল)
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.94 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.82 });
  const leafMidMat = new THREE.MeshStandardMaterial({ color: 0x2e6f40, roughness: 0.78 });
  const krishnochuraFlowerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.72 });
  const krishnochuraOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.72 });
  disposables.push(barkMat, leafDarkMat, leafMidMat, krishnochuraFlowerMat, krishnochuraOrangeMat);

  const buildTropicalTree = (x: number, z: number, kind: 'krishnochura' | 'mango' | 'coconut', idx: number) => {
    const tree = new THREE.Group();
    tree.position.set(x, 0.12, z);

    if (kind === 'coconut') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.26, 7.6, 8), barkMat);
      trunk.position.y = 3.8;
      trunk.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.06;
      trunk.castShadow = true;
      tree.add(trunk);

      for (let f = 0; f < 7; f++) {
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 2.6), leafMidMat);
        const angle = (f / 7) * Math.PI * 2;
        frond.position.set(Math.sin(angle) * 1.15, 7.5, Math.cos(angle) * 1.15);
        frond.rotation.y = angle;
        frond.rotation.x = 0.34;
        frond.castShadow = true;
        tree.add(frond);
      }
    } else {
      // Broad Bangladeshi Trunk + Multi-lobe Dense Canopy (Mango / Krishnochura)
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.44, 3.6, 8), barkMat);
      trunk.position.y = 1.8;
      trunk.castShadow = true;
      tree.add(trunk);

      const canopyMat = kind === 'krishnochura' ? krishnochuraFlowerMat : leafDarkMat;
      const secondaryMat = kind === 'krishnochura' ? krishnochuraOrangeMat : leafMidMat;

      const crownOffsets: [number, number, number, number][] = [
        [0, 4.7, 0, 2.4],
        [-1.35, 4.1, 0.7, 1.7],
        [1.35, 4.2, -0.6, 1.75],
        [0.4, 4.4, 1.3, 1.6],
      ];
      crownOffsets.forEach(([cx, cy, cz, rad], ci) => {
        const lobe = new THREE.Mesh(
          new THREE.DodecahedronGeometry(rad, 1),
          ci % 2 === 0 ? canopyMat : secondaryMat
        );
        lobe.scale.set(1.15, 0.72, 1.15);
        lobe.position.set(cx, cy, cz);
        lobe.castShadow = true;
        lobe.receiveShadow = true;
        tree.add(lobe);
      });
    }
    scene.add(tree);
  };

  const dhakaTrees: [number, number, 'krishnochura' | 'mango' | 'coconut'][] = [
    [-13.5, -24, 'krishnochura'],
    [13.5, -26, 'mango'],
    [-13.5, 24, 'mango'],
    [13.5, 34, 'krishnochura'],
    [-13.5, -56, 'coconut'],
    [13.5, -56, 'coconut'],
    [-13.5, 56, 'krishnochura'],
    [13.5, 56, 'mango'],
    [-38, -13, 'krishnochura'],
    [38, -13, 'mango'],
    [-38, 13, 'coconut'],
    [38, 13, 'krishnochura'],
  ];
  dhakaTrees.forEach(([tx, tz, kind], i) => buildTropicalTree(tx, tz, kind, i));

  // 6. Concrete Dhaka Electric Street Poles & Glowing Bulbs
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });
  disposables.push(poleMat, lampBulbMat);

  for (let z = -66; z <= 66; z += 22) {
    if (Math.abs(z) < 10) continue;
    for (const lx of [-9.4, 9.4]) {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0.12, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 5.2, 8), poleMat);
      pole.position.y = 2.6;
      pole.castShadow = true;
      lamp.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), poleMat);
      arm.position.set(lx < 0 ? 0.5 : -0.5, 5.1, 0);
      lamp.add(arm);

      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.18), lampBulbMat);
      bulb.position.set(lx < 0 ? 0.95 : -0.95, 5.02, 0);
      lamp.add(bulb);
      scene.add(lamp);
    }
  }

  // 7. Distant Horizon Skyline Haze (No floating indoor box)
  const skylineMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  disposables.push(skylineMat);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const dist = 230;
    const block = new THREE.Mesh(new THREE.BoxGeometry(24, 30 + (i % 4) * 14, 24), skylineMat);
    block.position.set(Math.cos(ang) * dist, 15, Math.sin(ang) * dist);
    scene.add(block);
    disposables.push(block.geometry);
  }

  // 7b. Robbery / Heist 3D Ground Beacon Markers (Dhaka Bank & Swapno SuperShop)
  const robberySpots: RobberySpot[] = [
    {
      id: 'rob-bank',
      name: 'Dhaka Bank Vault',
      x: 15.2,
      z: -38,
      rewardMin: 45000,
      rewardMax: 75000,
      durationSec: 9,
      wantedStars: 3,
      cooldownUntil: 0,
    },
    {
      id: 'rob-swapno',
      name: 'Swapno SuperShop',
      x: -15.2,
      z: 38,
      rewardMin: 10000,
      rewardMax: 18000,
      durationSec: 5,
      wantedStars: 2,
      cooldownUntil: 0,
    },
  ];

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  disposables.push(beaconMat);

  for (const spot of robberySpots) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.45, 28), beaconMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spot.x, 0.16, spot.z);
    scene.add(ring);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 10), beaconMat);
    pillar.position.set(spot.x, 1.25, spot.z);
    scene.add(pillar);
    disposables.push(ring.geometry, pillar.geometry);
  }

  // 7c. Dhaka Customs (LS Customs) 3D Service Bay at (-13.8, -23.5)
  const customsGroup = new THREE.Group();
  customsGroup.position.set(DHAKA_CUSTOMS_POS.x, 0.12, DHAKA_CUSTOMS_POS.z);

  const customsCanopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.55 });
  const customsNeonMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.5,
  });
  const customsCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.28, 7.6), customsCanopyMat);
  customsCanopy.position.set(0, 3.6, 0);
  customsCanopy.castShadow = true;
  customsGroup.add(customsCanopy);

  const customsStrip = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.16, 7.7), customsNeonMat);
  customsStrip.position.set(0, 3.75, 0);
  customsGroup.add(customsStrip);

  for (const px of [-2.4, 2.4]) {
    for (const pz of [-3.3, 3.3]) {
      const liftPost = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.6, 0.24), grillRailMat);
      liftPost.position.set(px, 1.8, pz);
      liftPost.castShadow = true;
      customsGroup.add(liftPost);
      disposables.push(liftPost.geometry);
    }
  }

  const customsRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.55, 32),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
  );
  customsRing.rotation.x = -Math.PI / 2;
  customsRing.position.y = 0.06;
  customsGroup.add(customsRing);
  scene.add(customsGroup);
  disposables.push(customsCanopyMat, customsNeonMat, customsCanopy.geometry, customsStrip.geometry, customsRing.geometry);

  // 7d. Dynasty 8 Apartment Entrance Beacons
  const propBeaconMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const highEndBeaconMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  disposables.push(propBeaconMat, highEndBeaconMat);
  for (const prop of INITIAL_PROPERTIES) {
    const mat = prop.hasHeistRoom ? highEndBeaconMat : propBeaconMat;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.5, 28), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(prop.x, 0.15, prop.z);
    const doorPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 10), mat);
    doorPost.position.set(prop.x, 1.0, prop.z);
    scene.add(ring, doorPost);
    disposables.push(ring.geometry, doorPost.geometry);
  }

  // 8. Time-of-day atmospheric switcher (Dhaka hazy daylight, golden Padma/Dhaka sunset, neon Dhaka night)
  const updateLighting = (preset: TimePreset) => {
    if (preset === 'day') {
      const sky = new THREE.Color(0xa5c8e4);
      scene.background = sky;
      scene.fog = new THREE.FogExp2(0xa5c8e4, 0.0058);
      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 1.58;
      sunLight.position.set(48, 76, 36);
      hemiLight.color.setHex(0xbae6fd);
      hemiLight.groundColor.setHex(0x475569);
      hemiLight.intensity = 0.78;
      fillLight.intensity = 0.35;
      lampBulbMat.emissiveIntensity = 0.2;
    } else if (preset === 'sunset') {
      const sky = new THREE.Color(0xd97757);
      scene.background = sky;
      scene.fog = new THREE.FogExp2(0xc26d58, 0.007);
      sunLight.color.setHex(0xfb923c);
      sunLight.intensity = 1.35;
      sunLight.position.set(70, 22, 40);
      hemiLight.color.setHex(0xfdba74);
      hemiLight.groundColor.setHex(0x1e293b);
      hemiLight.intensity = 0.65;
      fillLight.intensity = 0.28;
      lampBulbMat.emissiveIntensity = 1.45;
    } else {
      const sky = new THREE.Color(0x0b1120);
      scene.background = sky;
      scene.fog = new THREE.FogExp2(0x0b1120, 0.0082);
      sunLight.color.setHex(0x94a3b8);
      sunLight.intensity = 0.55;
      sunLight.position.set(-35, 65, -25);
      hemiLight.color.setHex(0x1e293b);
      hemiLight.groundColor.setHex(0x090d16);
      hemiLight.intensity = 0.48;
      fillLight.intensity = 0.22;
      lampBulbMat.emissiveIntensity = 2.6;
    }
  };

  updateLighting('day');

  return {
    colliders,
    streetZones: STREET_ZONES,
    minimapBuildings,
    minimapRoads,
    robberySpots,
    sunLight,
    hemiLight,
    fillLight,
    updateLighting,
    dispose: () => {
      disposables.forEach((dItem) => dItem.dispose());
    },
  };
}
