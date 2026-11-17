import * as THREE from 'three';
import {
  NeonColorId,
  NpcRole,
  PlayerOutfitId,
  VehicleSpec,
  VehicleUpgradeState,
  WeaponId,
} from './types';

export interface CharacterRig {
  group: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  mouthMesh: THREE.Mesh;
  shirtMat?: THREE.MeshStandardMaterial;
  pantsMat?: THREE.MeshStandardMaterial;
  vestMat?: THREE.MeshStandardMaterial;
  ponytailMesh?: THREE.Mesh;
  capGroup?: THREE.Group;
  weaponMeshes: Record<Exclude<WeaponId, 'fists'>, THREE.Group>;
}

export interface NpcRig {
  name: string;
  role: NpcRole;
  isFemale: boolean;
  group: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  mouthMesh: THREE.Mesh;
  x: number;
  z: number;
  heading: number;
  walkCycle: number;
  panicked: boolean;
  panicTimer: number;
  isHostage: boolean;
  stationary: boolean;
  patrolAxis: 'x' | 'z';
  patrolDir: 1 | -1;
  alive: boolean;
  hp: number;
  emotion: 'neutral' | 'laugh' | 'cry' | 'happy' | 'angry';
  emotionUntil: number;
}

export interface VehicleRig {
  spec: VehicleSpec;
  group: THREE.Group;
  paintMat: THREE.MeshPhysicalMaterial;
  neonMesh: THREE.Mesh;
  neonMat: THREE.MeshBasicMaterial;
  neonLight: THREE.PointLight;
  plateMesh: THREE.Mesh;
  upgrades: VehicleUpgradeState;
  wheelPivots: {
    fl: THREE.Group;
    fr: THREE.Group;
    rl: THREE.Group;
    rr: THREE.Group;
  };
  wheelSpinners: THREE.Group[];
  headlightLeft: THREE.SpotLight;
  headlightRight: THREE.SpotLight;
  headlightMeshes: THREE.Mesh[];
  taillightMat: THREE.MeshStandardMaterial;
  policeLightRed?: THREE.MeshStandardMaterial;
  policeLightBlue?: THREE.MeshStandardMaterial;
  x: number;
  z: number;
  rotationY: number;
  speed: number;
  steerAngle: number;
  halfWidth: number;
  halfLength: number;
  health: number;
  fuel: number;
  aiDriven: boolean;
  aiLaneAxis: 'x' | 'z';
  aiLaneCoord: number;
  aiDir: 1 | -1;
}

function buildWeaponMeshes(): Record<Exclude<WeaponId, 'fists'>, THREE.Group> {
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.32, metalness: 0.85 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.72 });

  const pistol = new THREE.Group();
  const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.26), gunMetal);
  pSlide.position.set(0, 0.04, -0.14);
  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.07), gripMat);
  pGrip.position.set(0, -0.04, -0.04);
  pGrip.rotation.x = 0.2;
  pistol.add(pSlide, pGrip);
  pistol.visible = false;

  const smg = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.1, 0.42), gunMetal);
  sBody.position.set(0, 0.04, -0.2);
  const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 8), gunMetal);
  sBarrel.rotation.x = Math.PI / 2;
  sBarrel.position.set(0, 0.05, -0.45);
  const sMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.19, 0.055), gripMat);
  sMag.position.set(0, -0.09, -0.24);
  sMag.rotation.x = -0.15;
  smg.add(sBody, sBarrel, sMag);
  smg.visible = false;

  const shotgun = new THREE.Group();
  const shBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 8), gunMetal);
  shBarrel.rotation.x = Math.PI / 2;
  shBarrel.position.set(0, 0.05, -0.32);
  const shStock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.32), woodMat);
  shStock.position.set(0, 0.02, -0.06);
  const shPump = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.18), woodMat);
  shPump.position.set(0, 0.01, -0.38);
  shotgun.add(shBarrel, shStock, shPump);
  shotgun.visible = false;

  return { pistol, smg, shotgun };
}

interface HumanOutfitOptions {
  shirtColor: number;
  pantsColor: number;
  skinColor: number;
  shoeColor: number;
  hairColor: number;
  vestColor?: number;
  role?: NpcRole;
  isPlayer?: boolean;
  isLongCoat?: boolean;
  isFemale?: boolean;
}

// Lifelike anatomical human builder (ears, sclera/iris, animated mouth, belt, cultural & role attire)
function buildAnatomicalHuman(shadowTex: THREE.Texture, opts: HumanOutfitOptions) {
  const group = new THREE.Group();

  const shadowGeo = new THREE.PlaneGeometry(0.95, 0.95);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMesh = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.48 })
  );
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirtColor, roughness: 0.7, metalness: 0.04 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: opts.pantsColor, roughness: 0.82, metalness: 0.03 });
  const skinMat = new THREE.MeshStandardMaterial({ color: opts.skinColor, roughness: 0.52, metalness: 0.02 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: opts.shoeColor, roughness: 0.42, metalness: 0.08 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hairColor, roughness: 0.78 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.5 });

  // Articulated anatomical legs (thigh + knee + calf + sculpted shoe)
  const makeLeg = (offsetX: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(offsetX, 0.86, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.084, 0.28, 6, 12), pantsMat);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    pivot.add(thigh);

    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.3, 6, 12), pantsMat);
    calf.position.y = -0.56;
    calf.castShadow = true;
    pivot.add(calf);

    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.14, 4, 8), shoeMat);
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -0.8, -0.04);
    shoe.castShadow = true;
    pivot.add(shoe);

    return pivot;
  };

  const leftLegPivot = makeLeg(-0.105);
  const rightLegPivot = makeLeg(0.105);
  group.add(leftLegPivot, rightLegPivot);

  // Pelvis + Waist Belt with Metallic Buckle
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.16, 14), pantsMat);
  pelvis.scale.set(1.15, 1, 0.78);
  pelvis.position.y = 0.88;
  pelvis.castShadow = true;
  group.add(pelvis);

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.164, 0.164, 0.045, 14),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5 })
  );
  belt.scale.set(1.16, 1, 0.8);
  belt.position.y = 0.94;
  group.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.048, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.2 })
  );
  buckle.position.set(0, 0.94, -0.13);
  group.add(buckle);

  // Upper Torso Group
  const torso = new THREE.Group();
  torso.position.set(0, 1.18, 0);
  group.add(torso);

  const chestWidthScale = opts.isFemale ? 1.04 : 1.18;
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.152, 0.48, 14), shirtMat);
  chest.scale.set(chestWidthScale, 1, 0.72);
  chest.castShadow = true;
  torso.add(chest);

  // Doctor coat skirt / Female Kameez skirt
  if (opts.isLongCoat || opts.isFemale) {
    const coatMat = opts.isFemale
      ? new THREE.MeshStandardMaterial({ color: opts.shirtColor, roughness: 0.72 })
      : shirtMat;
    const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.215, 0.36, 14), coatMat);
    coatSkirt.scale.set(1.12, 1, 0.78);
    coatSkirt.position.y = -0.32;
    coatSkirt.castShadow = true;
    torso.add(coatSkirt);
  }

  // Female Dupatta / Orna scarf drape across shoulder
  if (opts.isFemale && opts.role !== 'nurse') {
    const ornaMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.68 });
    const orna = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.46, 0.25), ornaMat);
    orna.position.set(-0.1, 0.03, -0.02);
    orna.rotation.z = -0.32;
    torso.add(orna);
  }

  // Shopkeeper authentic Bangladeshi Gamcha (গামছা) on shoulder
  if (opts.role === 'shopkeeper') {
    const gamchaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.85 });
    const gamcha = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.24), gamchaMat);
    gamcha.position.set(0.14, 0.08, 0.01);
    torso.add(gamcha);
  }

  // Tactical vest for player / weapon dealer
  let vestMat: THREE.MeshStandardMaterial | undefined;
  if (opts.vestColor !== undefined) {
    vestMat = new THREE.MeshStandardMaterial({ color: opts.vestColor, roughness: 0.74, metalness: 0.14 });
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.208, 0.172, 0.38, 14), vestMat);
    vest.scale.set(1.18, 1, 0.76);
    vest.position.y = 0.02;
    vest.castShadow = true;
    torso.add(vest);
  }

  // Doctor stethoscope & ID badge / Nurse red cross badge
  if (opts.role === 'doctor') {
    const stethMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.6 });
    const collarTube = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 16, Math.PI * 1.4), stethMat);
    collarTube.rotation.x = Math.PI / 2.2;
    collarTube.rotation.z = -Math.PI * 0.2;
    collarTube.position.set(0, 0.23, -0.02);
    torso.add(collarTube);

    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.26, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5 })
    );
    tie.position.set(0, 0.06, -0.14);
    torso.add(tie);

    const idCard = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
    );
    idCard.position.set(0.1, 0.09, -0.145);
    torso.add(idCard);
  } else if (opts.role === 'nurse') {
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), crossMat);
    badge.position.set(-0.1, 0.1, -0.145);
    torso.add(badge);
  }

  // Articulated anatomical arms (shoulder sphere + upper arm + forearm + hand)
  const makeArm = (offsetX: number, addClipboard = false): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(offsetX, 0.21, 0);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 10), shirtMat);
    pivot.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.2, 6, 10), shirtMat);
    upperArm.position.y = -0.14;
    upperArm.castShadow = true;
    pivot.add(upperArm);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.044, 0.18, 6, 10),
      opts.role === 'nurse' || opts.role === 'civilian' ? skinMat : shirtMat
    );
    forearm.position.y = -0.34;
    forearm.castShadow = true;
    pivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), skinMat);
    hand.position.y = -0.46;
    pivot.add(hand);

    if (addClipboard) {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.24, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 })
      );
      board.position.set(0, -0.45, -0.09);
      board.rotation.x = 0.6;
      const paper = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.19, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 })
      );
      paper.position.set(0, -0.45, -0.105);
      paper.rotation.x = 0.6;
      pivot.add(board, paper);
    }

    return pivot;
  };

  const armOffset = opts.isFemale ? 0.245 : 0.265;
  const leftArmPivot = makeArm(-armOffset, opts.role === 'nurse');
  const rightArmPivot = makeArm(armOffset, false);
  torso.add(leftArmPivot, rightArmPivot);

  // Neck + Expressive Head Group (tiltable for laughing/crying!)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.062, 0.1, 10), skinMat);
  neck.position.y = 0.28;
  torso.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.43, 0);
  torso.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 16), skinMat);
  head.scale.set(0.92, 1.12, 0.96);
  head.castShadow = true;
  headGroup.add(head);

  // Ears
  for (const ex of [-0.115, 0.115]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), skinMat);
    ear.scale.set(0.55, 1.1, 0.75);
    ear.position.set(ex, 0.0, 0.0);
    headGroup.add(ear);
  }

  // Realistic Eyes (sclera + dark iris) + Eyebrows
  for (const ex of [-0.042, 0.042]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeWhiteMat);
    sclera.scale.set(1.1, 0.78, 0.6);
    sclera.position.set(ex, 0.018, -0.108);
    headGroup.add(sclera);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), irisMat);
    pupil.position.set(ex, 0.018, -0.117);
    headGroup.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.009, 0.012), hairMat);
    brow.position.set(ex, 0.044, -0.113);
    headGroup.add(brow);
  }

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.042, 0.026), skinMat);
  nose.position.set(0, -0.008, -0.12);
  headGroup.add(nose);

  const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.014, 0.015), lipMat);
  mouthMesh.position.set(0, -0.055, -0.112);
  headGroup.add(mouthMesh);

  // Hair / Cap / Nurse Cap / Surgical Mask / Female Bun
  if (opts.isPlayer) {
    const mask = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.11, 0.11, 12),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 })
    );
    mask.position.set(0, -0.04, -0.01);
    headGroup.add(mask);

    const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.132, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    capDome.position.y = 0.03;
    headGroup.add(capDome);

    const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.12), capMat);
    capBrim.position.set(0, 0.04, -0.14);
    headGroup.add(capBrim);
  } else {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat
    );
    hair.position.set(0, 0.012, 0.01);
    hair.rotation.x = 0.18;
    headGroup.add(hair);

    if (opts.isFemale) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), hairMat);
      bun.position.set(0, 0.01, 0.135);
      headGroup.add(bun);
    }

    if (opts.role === 'nurse') {
      const nurseCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.06, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
      );
      nurseCap.position.set(0, 0.145, 0);
      const redPlus = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.035, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xdc2626 })
      );
      redPlus.position.set(0, 0.145, -0.052);
      headGroup.add(nurseCap, redPlus);
    } else if (opts.role === 'doctor') {
      const surgicalMask = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.065, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.65 })
      );
      surgicalMask.position.set(0, -0.042, -0.11);
      headGroup.add(surgicalMask);
    }
  }

  return {
    group,
    leftLegPivot,
    rightLegPivot,
    leftArmPivot,
    rightArmPivot,
    torso,
    headGroup,
    mouthMesh,
    shirtMat,
    pantsMat,
    vestMat,
  };
}

export function createPlayerCharacter(shadowTex: THREE.Texture): CharacterRig {
  const base = buildAnatomicalHuman(shadowTex, {
    shirtColor: 0xe2e8f0,
    pantsColor: 0x1e293b,
    skinColor: 0xb97a50,
    shoeColor: 0x0f172a,
    hairColor: 0x0f172a,
    vestColor: 0x111827,
    isPlayer: true,
  });

  const ponytailMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.72 });
  const ponytailMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.22, 6, 10), ponytailMat);
  ponytailMesh.position.set(0, -0.02, 0.14);
  ponytailMesh.rotation.x = 0.25;
  ponytailMesh.visible = false;
  base.headGroup.add(ponytailMesh);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.45, -0.02);
  const weaponMeshes = buildWeaponMeshes();
  weaponMount.add(weaponMeshes.pistol, weaponMeshes.smg, weaponMeshes.shotgun);
  base.rightArmPivot.add(weaponMount);

  return {
    ...base,
    ponytailMesh,
    weaponMeshes,
  };
}

export function applyPlayerProtagonist(
  rig: CharacterRig,
  protagonist: 'sadik' | 'nadia',
  outfit: PlayerOutfitId
): void {
  if (rig.ponytailMesh) {
    rig.ponytailMesh.visible = protagonist === 'nadia';
  }
  applyPlayerOutfit(rig, outfit);
  if (protagonist === 'nadia' && rig.shirtMat && rig.vestMat && outfit === 'tg_boss') {
    rig.shirtMat.color.setHex(0xf43f5e);
    rig.vestMat.color.setHex(0x1e1b4b);
  }
}

export function applyPlayerOutfit(rig: CharacterRig, outfit: PlayerOutfitId): void {
  if (!rig.shirtMat || !rig.pantsMat || !rig.vestMat) return;
  if (outfit === 'tg_boss') {
    rig.shirtMat.color.setHex(0xe2e8f0);
    rig.vestMat.color.setHex(0x111827);
    rig.pantsMat.color.setHex(0x1e293b);
  } else if (outfit === 'dmp_tac') {
    rig.shirtMat.color.setHex(0x1e3a8a);
    rig.vestMat.color.setHex(0x0f172a);
    rig.pantsMat.color.setHex(0x0f172a);
  } else if (outfit === 'dhaka_panjabi') {
    rig.shirtMat.color.setHex(0xfef3c7);
    rig.vestMat.color.setHex(0x0f766e);
    rig.pantsMat.color.setHex(0xf8fafc);
  } else if (outfit === 'racer_red') {
    rig.shirtMat.color.setHex(0xdc2626);
    rig.vestMat.color.setHex(0x18181b);
    rig.pantsMat.color.setHex(0x18181b);
  }
}

export function createNpcPedestrian(
  shadowTex: THREE.Texture,
  x: number,
  z: number,
  patrolAxis: 'x' | 'z',
  patrolDir: 1 | -1,
  variant: number,
  role: NpcRole = 'civilian',
  customName?: string,
  stationary = false
): NpcRig {
  const npcConfigs: { name: string; isFemale: boolean }[] = [
    { name: 'আন্টি নাসরিন', isFemale: true },
    { name: 'করিম চাচা', isFemale: false },
    { name: 'রাহাত ভাই', isFemale: false },
    { name: 'মিসেস তানিয়া', isFemale: true },
    { name: 'সোহেল মিয়া', isFemale: false },
    { name: 'ফারিয়া আপু', isFemale: true },
    { name: 'জামাল সাহেব', isFemale: false },
    { name: 'শাকিল ভাই', isFemale: false },
  ];
  const cfg = npcConfigs[variant % npcConfigs.length];
  const isFemale = role === 'nurse' || (role === 'civilian' && cfg.isFemale);

  const shirtColors = [0xf8fafc, 0x0284c7, 0x15803d, 0xb45309, 0x6d28d9, 0xdc2626];
  const pantColors = [0x1e293b, 0x334155, 0x292524, 0xe2e8f0];

  const outfit: HumanOutfitOptions =
    role === 'doctor'
      ? {
          shirtColor: 0xf8fafc,
          pantsColor: 0x1e293b,
          skinColor: 0xc2855a,
          shoeColor: 0x18181b,
          hairColor: 0x0f172a,
          role: 'doctor',
          isLongCoat: true,
        }
      : role === 'nurse'
      ? {
          shirtColor: 0x0ea5e9,
          pantsColor: 0x0284c7,
          skinColor: 0xc98f65,
          shoeColor: 0xf1f5f9,
          hairColor: 0x1e1b18,
          role: 'nurse',
          isFemale: true,
        }
      : role === 'shopkeeper'
      ? {
          shirtColor: 0xd97706,
          pantsColor: 0x292524,
          skinColor: 0xb07046,
          shoeColor: 0x18181b,
          hairColor: 0x0f172a,
          role: 'shopkeeper',
        }
      : role === 'dealer'
      ? {
          shirtColor: 0x334155,
          pantsColor: 0x0f172a,
          skinColor: 0xaa6c42,
          shoeColor: 0x09090b,
          hairColor: 0x0f172a,
          vestColor: 0x111827,
          role: 'dealer',
        }
      : {
          shirtColor: shirtColors[variant % shirtColors.length],
          pantsColor: pantColors[variant % pantColors.length],
          skinColor: 0xb5774b,
          shoeColor: 0x18181b,
          hairColor: 0x0f172a,
          role: 'civilian',
          isLongCoat: variant % 3 === 0,
          isFemale,
        };

  const base = buildAnatomicalHuman(shadowTex, outfit);
  base.group.position.set(x, 0, z);

  const heading =
    patrolAxis === 'z'
      ? patrolDir === -1
        ? 0
        : Math.PI
      : patrolDir === 1
      ? -Math.PI / 2
      : Math.PI / 2;

  base.group.rotation.y = heading;

  return {
    name: customName ?? cfg.name,
    role,
    isFemale,
    group: base.group,
    leftLegPivot: base.leftLegPivot,
    rightLegPivot: base.rightLegPivot,
    leftArmPivot: base.leftArmPivot,
    rightArmPivot: base.rightArmPivot,
    torso: base.torso,
    headGroup: base.headGroup,
    mouthMesh: base.mouthMesh,
    x,
    z,
    heading,
    walkCycle: variant * 1.1,
    panicked: false,
    panicTimer: 0,
    isHostage: false,
    stationary,
    patrolAxis,
    patrolDir,
    alive: true,
    hp: 100,
    emotion: 'neutral',
    emotionUntil: 0,
  };
}

export function createVehicle(spec: VehicleSpec, shadowTex: THREE.Texture, isSoftwareGl: boolean): VehicleRig {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.rotationY;

  const isCng = spec.kind === 'cng';
  const isSUV = spec.kind === 'suv';
  const isPolice = spec.kind === 'police';
  const isAmbulance = spec.kind === 'ambulance';
  const isCoupe = spec.kind === 'coupe';

  const bodyWidth = isCng ? 1.48 : isSUV || isAmbulance ? 2.15 : 1.98;
  const bodyLength = isCng ? 2.95 : isAmbulance ? 5.1 : isSUV ? 4.75 : isCoupe ? 4.45 : 4.6;

  const shadowGeo = new THREE.PlaneGeometry(bodyWidth * 1.45, bodyLength * 1.28);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowPlane = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.62 })
  );
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    metalness: isCng ? 0.45 : 0.72,
    roughness: isCng ? 0.36 : 0.22,
    clearcoat: isCng ? 0.4 : 1.0,
    clearcoatRoughness: 0.08,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.78, metalness: 0.18 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.94 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.1,
    roughness: 0.06,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.72,
    clearcoat: 1.0,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88, metalness: 0.04 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.9 });

  const wheelSpinners: THREE.Group[] = [];
  const headlightMeshes: THREE.Mesh[] = [];
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xef4444,
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.45,
    roughness: 0.15,
  });

  let fl: THREE.Group;
  let fr: THREE.Group;
  let rl: THREE.Group;
  let rr: THREE.Group;

  if (isCng) {
    const cngCanopyMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.85 });
    const cngYellowStripe = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });

    const lowerTub = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, 0.72, bodyLength * 0.76), paintMat);
    lowerTub.position.set(0, 0.62, -0.22);
    lowerTub.castShadow = true;
    group.add(lowerTub);

    const frontNose = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.76, 0.75), paintMat);
    frontNose.position.set(0, 0.64, bodyLength * 0.34);
    frontNose.castShadow = true;
    group.add(frontNose);

    const yellowBand = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth + 0.04, 0.12, bodyLength * 0.77), cngYellowStripe);
    yellowBand.position.set(0, 0.36, -0.22);
    group.add(yellowBand);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.64, 0.06), glassMat);
    windshield.position.set(0, 1.32, bodyLength * 0.26);
    windshield.rotation.x = -0.24;
    group.add(windshield);

    for (const sx of [-1, 1]) {
      for (const barY of [1.18, 1.38]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, bodyLength * 0.66), chromeMat);
        bar.position.set(sx * (bodyWidth / 2 - 0.04), barY, -0.22);
        group.add(bar);
      }
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.06), trimMat);
      post.position.set(sx * (bodyWidth / 2 - 0.05), 1.35, -bodyLength * 0.48);
      group.add(post);
    }

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.96, 0.14, bodyLength * 0.78), cngCanopyMat);
    canopy.position.set(0, 1.72, -0.18);
    canopy.castShadow = true;
    group.add(canopy);

    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 0.75, bodyLength * 0.47);
    group.add(hl);
    headlightMeshes.push(hl);

    for (const sx of [-0.52, 0.52]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.05), taillightMat);
      tl.position.set(sx, 0.58, -bodyLength * 0.58);
      group.add(tl);
    }

    const makeCngWheel = (wx: number, wz: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(wx, 0.26, wz);
      const spinner = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 16), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.19, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      spinner.add(tire, rim);
      pivot.add(spinner);
      wheelSpinners.push(spinner);
      group.add(pivot);
      return pivot;
    };

    fl = makeCngWheel(0, bodyLength * 0.36);
    fr = fl;
    rl = makeCngWheel(-bodyWidth * 0.46, -bodyLength * 0.36);
    rr = makeCngWheel(bodyWidth * 0.46, -bodyLength * 0.36);
  } else {
    const policeWhiteMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      metalness: 0.35,
      roughness: 0.22,
      clearcoat: 0.9,
    });

    const lowerHeight = isAmbulance ? 0.95 : isSUV ? 0.82 : 0.62;
    const cabinHeight = isAmbulance ? 0.95 : isSUV ? 0.68 : 0.52;
    const chassisBottomY = isSUV || isAmbulance ? 0.38 : 0.3;

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, lowerHeight, bodyLength), paintMat);
    lowerBody.position.y = chassisBottomY + lowerHeight / 2;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    group.add(lowerBody);

    if (isPolice) {
      const doorBand = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth + 0.03, lowerHeight * 0.88, bodyLength * 0.44),
        policeWhiteMat
      );
      doorBand.position.set(0, chassisBottomY + lowerHeight / 2, 0.05);
      group.add(doorBand);
    }

    if (isAmbulance) {
      // Red medical stripe & tall ambulance rear box
      const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth + 0.04, 0.18, bodyLength * 0.96), redStripeMat);
      stripe.position.set(0, chassisBottomY + lowerHeight * 0.55, 0);
      group.add(stripe);

      const medBox = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.96, cabinHeight, bodyLength * 0.66), paintMat);
      medBox.position.set(0, chassisBottomY + lowerHeight + cabinHeight / 2 - 0.05, -0.65);
      medBox.castShadow = true;
      group.add(medBox);

      // Red cross on sides
      for (const sx of [-1, 1]) {
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.42), redStripeMat);
        crossH.position.set(sx * (bodyWidth * 0.49), chassisBottomY + lowerHeight + 0.42, -0.65);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.14), redStripeMat);
        crossV.position.set(sx * (bodyWidth * 0.49), chassisBottomY + lowerHeight + 0.42, -0.65);
        group.add(crossH, crossV);
      }
    }

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth + 0.04, 0.24, 0.22), trimMat);
    frontBumper.position.set(0, chassisBottomY + 0.12, bodyLength / 2 + 0.04);
    group.add(frontBumper);

    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth + 0.04, 0.24, 0.2), trimMat);
    rearBumper.position.set(0, chassisBottomY + 0.12, -bodyLength / 2 - 0.03);
    group.add(rearBumper);

    const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.34, 0.06), chromeMat);
    grilleFrame.position.set(0, chassisBottomY + lowerHeight * 0.52, bodyLength / 2 + 0.02);
    group.add(grilleFrame);

    const grilleInner = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.26, 0.08), trimMat);
    grilleInner.position.set(0, chassisBottomY + lowerHeight * 0.52, bodyLength / 2 + 0.025);
    group.add(grilleInner);

    if (!isAmbulance) {
      const cabinLength = isSUV ? bodyLength * 0.64 : bodyLength * 0.5;
      const cabinZ = isSUV ? -0.35 : -0.22;
      const cabinY = chassisBottomY + lowerHeight + cabinHeight / 2;

      const cabinRoof = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.86, 0.09, cabinLength * 0.92),
        isPolice ? policeWhiteMat : paintMat
      );
      cabinRoof.position.set(0, cabinY + cabinHeight / 2 - 0.04, cabinZ);
      cabinRoof.castShadow = true;
      group.add(cabinRoof);

      const glassHouse = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.85, cabinHeight - 0.06, cabinLength * 0.94),
        glassMat
      );
      glassHouse.position.set(0, cabinY - 0.02, cabinZ);
      group.add(glassHouse);

      const pillarGeo = new THREE.BoxGeometry(0.08, cabinHeight, 0.09);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const pillar = new THREE.Mesh(pillarGeo, trimMat);
          pillar.position.set(sx * (bodyWidth * 0.42), cabinY, cabinZ + sz * (cabinLength * 0.45));
          group.add(pillar);
        }
      }
    } else {
      const cabGlass = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.86, 0.56, 0.95),
        glassMat
      );
      cabGlass.position.set(0, chassisBottomY + lowerHeight + 0.26, 1.35);
      group.add(cabGlass);
    }

    for (const sx of [-0.68, 0.68]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), headlightMat);
      hl.position.set(sx, chassisBottomY + lowerHeight * 0.62, bodyLength / 2 + 0.01);
      group.add(hl);
      headlightMeshes.push(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06), taillightMat);
      tl.position.set(sx, chassisBottomY + lowerHeight * 0.64, -bodyLength / 2 - 0.01);
      group.add(tl);
    }

    const wheelRadius = isSUV || isAmbulance ? 0.42 : 0.36;
    const wheelWidth = 0.28;
    const wheelOffsetX = bodyWidth / 2 - 0.04;
    const frontZ = bodyLength * 0.33;
    const rearZ = -bodyLength * 0.33;

    const makeWheel = (wx: number, wz: number): THREE.Group => {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wx, wheelRadius, wz);
      const spinGroup = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      spinGroup.add(tire);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.64, wheelRadius * 0.64, wheelWidth + 0.02, 12),
        rimMat
      );
      rim.rotation.z = Math.PI / 2;
      spinGroup.add(rim);
      for (let i = 0; i < 3; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(wheelWidth + 0.03, wheelRadius * 1.15, 0.055), trimMat);
        spoke.rotation.x = (i * Math.PI) / 3;
        spinGroup.add(spoke);
      }
      steerPivot.add(spinGroup);
      wheelSpinners.push(spinGroup);
      group.add(steerPivot);
      return steerPivot;
    };

    fl = makeWheel(-wheelOffsetX, frontZ);
    fr = makeWheel(wheelOffsetX, frontZ);
    rl = makeWheel(-wheelOffsetX, rearZ);
    rr = makeWheel(wheelOffsetX, rearZ);
  }

  const headlightLeft = new THREE.SpotLight(0xf8fafc, 0, 38, Math.PI / 5, 0.45, 1.5);
  headlightLeft.position.set(-0.55, 0.8, bodyLength / 2 + 0.1);
  headlightLeft.target.position.set(-0.55, 0.1, bodyLength / 2 + 16);
  group.add(headlightLeft, headlightLeft.target);

  const headlightRight = new THREE.SpotLight(0xf8fafc, 0, 38, Math.PI / 5, 0.45, 1.5);
  headlightRight.position.set(0.55, 0.8, bodyLength / 2 + 0.1);
  headlightRight.target.position.set(0.55, 0.1, bodyLength / 2 + 16);
  group.add(headlightRight, headlightRight.target);

  let policeLightRed: THREE.MeshStandardMaterial | undefined;
  let policeLightBlue: THREE.MeshStandardMaterial | undefined;
  if (isPolice || isAmbulance) {
    const barY = isAmbulance ? 2.28 : 1.48;
    const barZ = isAmbulance ? 1.15 : -0.12;
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.24), trimMat);
    barBase.position.set(0, barY, barZ);
    group.add(barBase);
    policeLightRed = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.8 });
    policeLightBlue = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 1.8 });
    const redBar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.22), policeLightRed);
    redBar.position.set(-0.28, barY + 0.04, barZ);
    const blueBar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.22), policeLightBlue);
    blueBar.position.set(0.28, barY + 0.04, barZ);
    group.add(redBar, blueBar);
  }

  // Custom License Plate Mesh + Neon Underglow Kit
  const createPlateTexture = (txt: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fefce8';
      ctx.fillRect(0, 0, 256, 96);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 248, 88);
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DHAKA METRO', 128, 30);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 34px monospace';
      ctx.fillText((txt || 'TG-1212').toUpperCase().slice(0, 9), 128, 72);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const defaultPlate = spec.kind === 'police' ? 'DMP-999' : spec.kind === 'cng' ? 'CNG-1212' : 'TG-BOSS';
  const plateMat = new THREE.MeshBasicMaterial({ map: createPlateTexture(defaultPlate) });
  const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.24), plateMat);
  plateMesh.position.set(0, isCng ? 0.42 : 0.48, -bodyLength / 2 - (isCng ? 0.14 : 0.14));
  plateMesh.rotation.y = Math.PI;
  group.add(plateMesh);

  const neonMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const neonMesh = new THREE.Mesh(new THREE.PlaneGeometry(bodyWidth * 0.92, bodyLength * 0.78), neonMat);
  neonMesh.rotation.x = -Math.PI / 2;
  neonMesh.position.y = 0.04;
  neonMesh.visible = false;
  group.add(neonMesh);

  const neonLight = new THREE.PointLight(0x06b6d4, 0, 7);
  neonLight.position.set(0, 0.22, 0);
  group.add(neonLight);

  const upgrades: VehicleUpgradeState = {
    paintHex: spec.color,
    paintName: 'Factory Paint',
    finish: 'metallic',
    engineLevel: 0,
    turbo: false,
    armorLevel: 0,
    brakesLevel: 0,
    neon: 'none',
    plateText: defaultPlate,
  };

  return {
    spec,
    group,
    paintMat,
    neonMesh,
    neonMat,
    neonLight,
    plateMesh,
    upgrades,
    wheelPivots: { fl, fr, rl, rr },
    wheelSpinners,
    headlightLeft,
    headlightRight,
    headlightMeshes,
    taillightMat,
    policeLightRed,
    policeLightBlue,
    x: spec.x,
    z: spec.z,
    rotationY: spec.rotationY,
    speed: 0,
    steerAngle: 0,
    halfWidth: bodyWidth / 2,
    halfLength: bodyLength / 2,
    health: 100,
    fuel: 100,
    aiDriven: !!spec.aiDriven,
    aiLaneAxis: spec.aiLaneAxis ?? 'z',
    aiLaneCoord: spec.aiLaneCoord ?? spec.x,
    aiDir: spec.aiDir ?? 1,
  };
}

const NEON_HEX_MAP: Record<NeonColorId, number> = {
  none: 0x000000,
  cyan: 0x06b6d4,
  crimson: 0xf43f5e,
  emerald: 0x10b981,
  gold: 0xf59e0b,
  purple: 0xa855f7,
};

export function applyVehicleUpgradesToRig(rig: VehicleRig, next: VehicleUpgradeState): void {
  rig.upgrades = { ...next };
  rig.paintMat.color.setHex(next.paintHex);
  if (next.finish === 'matte') {
    rig.paintMat.metalness = 0.12;
    rig.paintMat.roughness = 0.78;
    rig.paintMat.clearcoat = 0.05;
  } else if (next.finish === 'chrome') {
    rig.paintMat.metalness = 0.96;
    rig.paintMat.roughness = 0.08;
    rig.paintMat.clearcoat = 1.0;
  } else {
    rig.paintMat.metalness = 0.72;
    rig.paintMat.roughness = 0.22;
    rig.paintMat.clearcoat = 1.0;
  }
  rig.paintMat.needsUpdate = true;

  if (next.neon === 'none') {
    rig.neonMesh.visible = false;
    rig.neonLight.intensity = 0;
  } else {
    const hex = NEON_HEX_MAP[next.neon];
    rig.neonMesh.visible = true;
    rig.neonMat.color.setHex(hex);
    rig.neonLight.color.setHex(hex);
    rig.neonLight.intensity = 4.2;
  }

  const plateMat = rig.plateMesh.material as THREE.MeshBasicMaterial;
  plateMat.map?.dispose();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 88);
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DHAKA METRO', 128, 30);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px monospace';
    ctx.fillText((next.plateText || 'TG-1212').toUpperCase().slice(0, 9), 128, 72);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  plateMat.map = tex;
  plateMat.needsUpdate = true;
}

export interface RemotePlayerRig {
  id: number;
  group: THREE.Group;
  humanRig: ReturnType<typeof buildAnatomicalHuman>;
  vehicleGroup: THREE.Group;
  labelSprite: THREE.Sprite;
  labelText: string;
  targetX: number;
  targetZ: number;
  targetHeading: number;
  x: number;
  z: number;
  heading: number;
  walkCycle: number;
  inVehicle: boolean;
  passiveMode: boolean;
}

function buildRemoteLabelTexture(label: string, wantedStars: number, passiveMode: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = passiveMode ? 'rgba(15, 23, 42, 0.58)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = wantedStars > 0 ? '#ef4444' : passiveMode ? '#94a3b8' : '#2dd4bf';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(10, 10, 300, 44, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = passiveMode ? '#cbd5e1' : '#f8fafc';
    const starsSuffix = wantedStars > 0 ? ` ★${wantedStars}` : passiveMode ? ' (Passive)' : '';
    ctx.fillText(`${label}${starsSuffix}`.slice(0, 26), 160, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRemotePlayerAvatar(
  shadowTex: THREE.Texture,
  id: number,
  name: string,
  gangTag: string,
  x: number,
  z: number,
  heading: number
): RemotePlayerRig {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = heading;

  const palette = [0x0ea5e9, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
  const shirtColor = palette[id % palette.length];

  const humanRig = buildAnatomicalHuman(shadowTex, {
    shirtColor,
    pantsColor: 0x0f172a,
    skinColor: 0xb97a50,
    shoeColor: 0x09090b,
    hairColor: 0x0f172a,
    vestColor: 0x1e293b,
    isPlayer: true,
  });
  group.add(humanRig.group);

  // Compact proxy vehicle shown when the remote player is driving
  const vehicleGroup = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.3, metalness: 0.6 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.2 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 4.3), bodyMat);
  carBody.position.y = 0.62;
  carBody.castShadow = true;
  const carCabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.62, 2.2), cabinMat);
  carCabin.position.set(0, 1.24, -0.15);
  vehicleGroup.add(carBody, carCabin);
  for (const [wx, wz] of [
    [-0.95, 1.3],
    [0.95, 1.3],
    [-0.95, -1.3],
    [0.95, -1.3],
  ]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    vehicleGroup.add(w);
  }
  vehicleGroup.visible = false;
  group.add(vehicleGroup);

  const labelText = gangTag ? `[${gangTag}] ${name}` : name;
  const tex = buildRemoteLabelTexture(labelText, 0, false);
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const labelSprite = new THREE.Sprite(spriteMat);
  labelSprite.position.set(0, 2.35, 0);
  labelSprite.scale.set(2.4, 0.48, 1);
  group.add(labelSprite);

  return {
    id,
    group,
    humanRig,
    vehicleGroup,
    labelSprite,
    labelText,
    targetX: x,
    targetZ: z,
    targetHeading: heading,
    x,
    z,
    heading,
    walkCycle: 0,
    inVehicle: false,
    passiveMode: false,
  };
}

export function updateRemoteAvatarLabel(
  rig: RemotePlayerRig,
  name: string,
  gangTag: string,
  wantedStars: number,
  passiveMode: boolean
): void {
  const nextLabel = `${gangTag ? `[${gangTag}] ` : ''}${name}|${wantedStars}|${passiveMode ? 'P' : 'A'}`;
  if (rig.labelText === nextLabel) return;
  rig.labelText = nextLabel;
  const mat = rig.labelSprite.material as THREE.SpriteMaterial;
  mat.map?.dispose();
  mat.map = buildRemoteLabelTexture(gangTag ? `[${gangTag}] ${name}` : name, wantedStars, passiveMode);
  mat.needsUpdate = true;
}
