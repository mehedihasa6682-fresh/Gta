import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ProceduralAudio } from './audio';
import {
  applyPlayerOutfit,
  applyPlayerProtagonist,
  applyVehicleUpgradesToRig,
  CharacterRig,
  createNpcPedestrian,
  createPlayerCharacter,
  createRemotePlayerAvatar,
  createVehicle,
  NpcRig,
  RemotePlayerRig,
  updateRemoteAvatarLabel,
  VehicleRig,
} from './entities';
import { MultiplayerClient } from './multiplayer';
import {
  ChatRole,
  findRoleChatReply,
  RoleChatReply,
} from './roleChats';
import { createContactShadowTexture } from './textures';
import {
  ActiveJobState,
  AmbientSpeechBubble,
  ControlInput,
  GpsTarget,
  HeistState,
  HUDState,
  InventoryItem,
  InventoryItemId,
  JobKind,
  MpChatChannel,
  MpChatMessage,
  PlayerLifeState,
  PlayerOutfitId,
  PropertySpec,
  ProtagonistId,
  RadioStationId,
  RemotePlayerState,
  RobberySpot,
  SocialPost,
  TimePreset,
  TurfZone,
  VehicleUpgradeState,
  WeaponId,
  WeaponSpec,
} from './types';
import {
  buildDhakaWorld,
  CityWorld,
  DHAKA_CUSTOMS_POS,
  INITIAL_PROPERTIES,
  INITIAL_TURF_ZONES,
  INITIAL_VEHICLES,
} from './world';

const _camDesiredPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();

const SAVE_KEY = 'dhaka_city_rp_save_v1';

export const WEAPON_CATALOG: Record<WeaponId, WeaponSpec> = {
  fists: { id: 'fists', name: 'Fists (Melee)', damage: 25, fireRateMs: 420, magSize: 0, spread: 0, pellets: 1, range: 2.2 },
  pistol: { id: 'pistol', name: '9mm Pistol', damage: 34, fireRateMs: 280, magSize: 12, spread: 0.025, pellets: 1, range: 55 },
  smg: { id: 'smg', name: 'Micro SMG', damage: 22, fireRateMs: 110, magSize: 30, spread: 0.055, pellets: 1, range: 50 },
  shotgun: { id: 'shotgun', name: 'Pump Shotgun', damage: 18, fireRateMs: 750, magSize: 8, spread: 0.12, pellets: 5, range: 32 },
};

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 'tea', name: 'টং চা ও বিস্কুট', count: 2, price: 30, description: '+30 Hunger · +25 Thirst' },
  { id: 'water', name: 'মিনারেল ওয়াটার', count: 2, price: 25, description: '+45 Thirst' },
  { id: 'bandage', name: 'মেডিকেল ব্যান্ডেজ', count: 2, price: 200, description: '+35 Health' },
  { id: 'armor', name: 'কেভলার আর্মার ভেস্ট', count: 1, price: 1200, description: '+60 Armor' },
  { id: 'ammo_pack', name: 'অ্যামো বক্স (All Guns)', count: 1, price: 800, description: '+Pistol/SMG/Shotgun Ammo' },
];

interface BulletTracer {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  damage: number;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private world: CityWorld;
  private player: CharacterRig;
  private vehicles: VehicleRig[] = [];
  private npcs: NpcRig[] = [];
  private tracers: BulletTracer[] = [];
  private tracerGeo = new THREE.BoxGeometry(0.05, 0.05, 0.85);
  private tracerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  private muzzleLight = new THREE.PointLight(0xfbbf24, 0, 12);

  private audio = new ProceduralAudio();
  private isSoftwareGl: boolean;
  private shadowTex: THREE.Texture;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private hudEmitTimer = 0;
  private saveTimer = 0;
  private onHudUpdate: (state: HUDState) => void;
  private onContextLostChange?: (lost: boolean) => void;

  // Player physics
  private playerX = 2.4;
  private playerY = 0;
  private playerZ = 7.2;
  private playerVelY = 0;
  private playerHeading = 0;
  private walkCycle = 0;

  // Vehicle & Time
  private activeVehicle: VehicleRig | null = null;
  private headlightsOn = false;
  private timePreset: TimePreset = 'day';
  private gameMinutes = 12 * 60 + 24;

  // Player stats & combat
  private health = 100;
  private armor = 85;
  private hunger = 92;
  private thirst = 88;
  private stamina = 100;
  private cash = 14250;
  private bank = 185400;
  private wantedStars = 0;
  private inventory: InventoryItem[] = DEFAULT_INVENTORY.map((i) => ({ ...i }));
  private gpsTarget: GpsTarget | null = null;

  // Hostage & Robbery & Police Chase states
  private hostageNpc: NpcRig | null = null;
  private hostageDialogue: string | null = null;
  private hostageDialogueTimer = 0;
  private activeRobbery: RobberySpot | null = null;
  private robberyElapsed = 0;
  private alarmTimer = 0;
  private sirenTimer = 0;
  private evadeTimer = 0;
  private policeHoldFireUntil = 0;
  private statusBanner: string | null = null;
  private statusBannerUntil = 0;

  // Roleplay Jobs & Gang Turfs
  private activeJob: ActiveJobState | null = null;
  private jobDropTarget: { name: string; x: number; z: number } | null = null;
  private turfZones: TurfZone[] = INITIAL_TURF_ZONES.map((t) => ({ ...t }));
  private activeTurf: { name: string; owner: 'TG' | 'RIVAL'; progress: number } | null = null;
  private turfCaptureElapsed = 0;
  private completedJobs = 0;
  private gangRep = 120;
  private jobBeaconGroup = new THREE.Group();
  private jobBeaconMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  private jobBeaconGeos: THREE.BufferGeometry[] = [];
  private turfMeshes: { id: string; mat: THREE.MeshBasicMaterial; geo: THREE.BufferGeometry }[] = [];

  private equippedWeapon: WeaponId = 'fists';
  private ammoState: Record<WeaponId, { mag: number; reserve: number }> = {
    fists: { mag: 0, reserve: 0 },
    pistol: { mag: 12, reserve: 72 },
    smg: { mag: 30, reserve: 150 },
    shotgun: { mag: 8, reserve: 32 },
  };
  private lastFireTime = 0;
  private reloadingUntil = 0;
  private punchAnimTimer = 0;

  // Camera
  private onFootCamYaw = 0;
  private camYawOffset = 0;
  private camPitch = 0.34;
  private currentCamPos = new THREE.Vector3(2.4, 4.2, 14);
  private currentLookAt = new THREE.Vector3(2.4, 1.5, 7.2);

  // Multiplayer & FiveM RP Session State
  private mp: MultiplayerClient | null = null;
  private mpConnected = false;
  private mpPlayerId: number | null = null;
  private mpPlayerName = 'BOSS Sadik';
  private mpGangTag = 'TG';
  private mpPingMs = 24;
  private passiveMode = false;
  private remotePlayers: RemotePlayerState[] = [];
  private remoteRigs = new Map<number, RemotePlayerRig>();
  private mpChatFeed: MpChatMessage[] = [];

  // Step 7: LS Customs Tuning, Dynasty 8 Properties & Bank Heist
  private properties: PropertySpec[] = INITIAL_PROPERTIES.map((p) => ({ ...p }));
  private spawnPropertyId: string | null = null;
  private equippedOutfit: PlayerOutfitId = 'tg_boss';
  private savedVehicleUpgrades: Record<string, Partial<VehicleUpgradeState>> = {};
  private lastTurboTrigger = 0;
  private heist: HeistState = {
    stage: 'idle',
    setup1Done: false,
    setup2Done: false,
    targetName: 'Dhaka Bank Vault',
    targetX: 15.2,
    targetZ: -38,
    potentialPayout: 200000,
    completedHeists: 0,
  };
  private heistPickupPhase: 'outbound' | 'return' = 'outbound';
  private heistBeaconGroup = new THREE.Group();
  private heistBeaconMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });

  private input: ControlInput = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    jump: false,
    handbrake: false,
    firing: false,
    aiming: false,
  };
  private jumpLatch = false;

  // GTA 5 & GTA 6 Core Systems: Radio, Dual Protagonist, Wasted/Busted, Dispatch, Ambient Voice & DhakaGram Social
  private radioStation: RadioStationId = 'off';
  private protagonist: ProtagonistId = 'sadik';
  private switchingUntil = 0;
  private lifeState: PlayerLifeState = 'alive';
  private lifeStateUntil = 0;
  private lifeMessage: string | null = null;
  private bustedTimer = 0;
  private hitMarkerUntil = 0;
  private policeDispatchBanner: string | null = null;
  private policeDispatchUntil = 0;
  private lastDispatchAt = 0;
  private ambientSpeech: AmbientSpeechBubble | null = null;
  private ambientSpeechUntil = 0;
  private lastAmbientVoiceAt = 0;
  private socialFeed: SocialPost[] = [
    {
      id: 'soc-init-1',
      handle: '@dhaka_spotter',
      author: 'Dhaka Car Spotters',
      caption: 'গুলশান অ্যাভিনিউতে কালো Toyota Prado আর লাল GT-R একসাথে! 🔥🚗 #DhakaCustoms',
      tag: '#DhakaLife',
      likes: 412,
      timeAgo: '2m ago',
    },
    {
      id: 'soc-init-2',
      handle: '@dmp_traffic999',
      author: 'DMP Alerts BD',
      caption: 'মিরপুর রোড ও বনানী ১১-এ প্যাট্রোল জোরদার করা হয়েছে। হাইস্পিডে গাড়ি চালাবেন না। 🚨',
      tag: '#DMP999',
      likes: 289,
      timeAgo: '6m ago',
    },
    {
      id: 'soc-init-3',
      handle: '@mamun_tong',
      author: 'মামুন চাওয়ালা',
      caption: 'সকাল থেকেই স্পেশাল আদা-মালাই চা রেডি! চলে আসো ভাইয়েরা ☕✨',
      tag: '#GulshanTong',
      likes: 640,
      timeAgo: '11m ago',
    },
  ];

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: HUDState) => void,
    onContextLostChange?: (lost: boolean) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLostChange = onContextLostChange;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.loadProgress();

    this.scene = new THREE.Scene();
    this.scene.add(this.muzzleLight);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 480);
    this.camera.position.copy(this.currentCamPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.shadowTex = createContactShadowTexture();
    this.world = buildDhakaWorld(this.scene, maxAniso);

    this.player = createPlayerCharacter(this.shadowTex);
    applyPlayerProtagonist(this.player, this.protagonist, this.equippedOutfit);
    if (this.spawnPropertyId) {
      const spawnProp = this.properties.find((p) => p.id === this.spawnPropertyId && p.owned);
      if (spawnProp) {
        this.playerX = spawnProp.x > 0 ? spawnProp.x - 2.2 : spawnProp.x + 2.2;
        this.playerZ = spawnProp.z;
      }
    }
    this.player.group.position.set(this.playerX, 0, this.playerZ);
    this.scene.add(this.player.group);

    for (const spec of INITIAL_VEHICLES) {
      const veh = createVehicle(spec, this.shadowTex, this.isSoftwareGl);
      const savedMods = this.savedVehicleUpgrades[spec.id];
      if (savedMods) {
        applyVehicleUpgradesToRig(veh, { ...veh.upgrades, ...savedMods });
      }
      this.scene.add(veh.group);
      this.vehicles.push(veh);
    }

    // Spawn Dhaka Medical Doctors & Nurses right at Hospital Entrance Porch!
    const serviceNpcs: {
      x: number;
      z: number;
      role: 'doctor' | 'nurse' | 'shopkeeper' | 'dealer';
      name: string;
      dir: 1 | -1;
      axis: 'x' | 'z';
    }[] = [
      { x: 15.2, z: 36.2, role: 'doctor', name: 'Dr. Farhan (DMCH)', axis: 'x', dir: -1 },
      { x: 15.2, z: 39.8, role: 'nurse', name: 'Nurse Mim', axis: 'x', dir: -1 },
      { x: 14.0, z: 34.0, role: 'nurse', name: 'Nurse Tasnim', axis: 'x', dir: -1 },
      { x: -13.0, z: -12.2, role: 'shopkeeper', name: 'মামুন চাওয়ালা (Tong)', axis: 'x', dir: 1 },
      { x: -14.8, z: -36.0, role: 'dealer', name: 'রকি ডিলার (Ammu-Nation)', axis: 'x', dir: 1 },
    ];
    serviceNpcs.forEach((s, idx) => {
      const npc = createNpcPedestrian(
        this.shadowTex,
        s.x,
        s.z,
        s.axis,
        s.dir,
        idx,
        s.role,
        s.name,
        true
      );
      this.scene.add(npc.group);
      this.npcs.push(npc);
    });

    // Spawn Dhaka street civilians
    const npcConfigs: [number, number, 'x' | 'z', 1 | -1][] = [
      [-12.2, -32, 'z', 1], [-12.6, 18, 'z', -1], [12.2, -25, 'z', 1], [12.6, 26, 'z', -1],
      [-12.5, -62, 'z', 1], [12.5, 62, 'z', -1], [-45, -10.5, 'x', 1], [35, -10.5, 'x', -1],
      [-32, 10.5, 'x', 1], [48, 10.5, 'x', -1], [-12, 4, 'z', -1], [12, -8, 'z', 1],
    ];
    npcConfigs.forEach(([nx, nz, axis, dir], idx) => {
      const npc = createNpcPedestrian(this.shadowTex, nx, nz, axis, dir, idx, 'civilian');
      this.scene.add(npc.group);
      this.npcs.push(npc);
    });

    // 3D Dynamic Job Target Beacon & Dhaka Turf Boundary Rings
    const jRingGeo = new THREE.RingGeometry(1.5, 2.0, 28);
    const jPillarGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.5, 10);
    this.jobBeaconGeos.push(jRingGeo, jPillarGeo);
    const jRing = new THREE.Mesh(jRingGeo, this.jobBeaconMat);
    jRing.rotation.x = -Math.PI / 2;
    jRing.position.y = 0.14;
    const jPillar = new THREE.Mesh(jPillarGeo, this.jobBeaconMat);
    jPillar.position.y = 2.85;
    this.jobBeaconGroup.add(jRing, jPillar);
    this.jobBeaconGroup.visible = false;
    this.scene.add(this.jobBeaconGroup);

    const hRingGeo = new THREE.RingGeometry(1.7, 2.25, 28);
    const hPillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 6.2, 10);
    this.jobBeaconGeos.push(hRingGeo, hPillarGeo);
    const hRing = new THREE.Mesh(hRingGeo, this.heistBeaconMat);
    hRing.rotation.x = -Math.PI / 2;
    hRing.position.y = 0.16;
    const hPillar = new THREE.Mesh(hPillarGeo, this.heistBeaconMat);
    hPillar.position.y = 3.2;
    this.heistBeaconGroup.add(hRing, hPillar);
    this.heistBeaconGroup.visible = false;
    this.scene.add(this.heistBeaconGroup);

    for (const turf of this.turfZones) {
      const geo = new THREE.RingGeometry(turf.radius - 0.35, turf.radius, 42);
      const mat = new THREE.MeshBasicMaterial({
        color: turf.owner === 'TG' ? 0x10b981 : 0xef4444,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(turf.x, 0.11, turf.z);
      this.scene.add(ring);
      this.turfMeshes.push({ id: turf.id, mat, geo });
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    window.addEventListener('resize', this.handleResize);

    this.mp = new MultiplayerClient({
      onConnectionChange: (connected, selfId) => {
        this.mpConnected = connected;
        this.mpPlayerId = selfId;
        this.emitHud();
      },
      onPlayersChange: (players) => {
        this.remotePlayers = players;
        this.syncRemotePlayerRigs(players);
      },
      onChatHistory: (messages) => {
        this.mpChatFeed = messages.slice(-40);
        this.emitHud();
      },
      onChatMessage: (message) => {
        if (this.mpChatFeed.some((m) => m.id === message.id)) return;
        this.mpChatFeed = [...this.mpChatFeed.slice(-39), message];
        if (message.channel === 'dispatch') {
          this.showBanner(message.text, 4800);
        }
        this.emitHud();
      },
      onTurfUpdated: (turfId, owner) => {
        const turf = this.turfZones.find((t) => t.id === turfId);
        if (turf && turf.owner !== owner) {
          turf.owner = owner;
          const meshEntry = this.turfMeshes.find((m) => m.id === turfId);
          if (meshEntry) meshEntry.mat.color.setHex(owner === 'TG' ? 0x10b981 : 0xef4444);
          this.emitHud();
        }
      },
      onPingUpdate: (pingMs) => {
        this.mpPingMs = pingMs;
      },
    });
    this.mp.updateJoinProfile(
      this.mpPlayerName,
      this.mpGangTag,
      this.activeJob ? this.activeJob.title : 'Citizen',
      this.playerX,
      this.playerZ,
      this.playerHeading,
      this.passiveMode
    );

    this.emitHud();
    this.scheduleNextTick();
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.cash === 'number') this.cash = parsed.cash;
      if (typeof parsed.bank === 'number') this.bank = parsed.bank;
      if (typeof parsed.health === 'number') this.health = Math.max(25, parsed.health);
      if (typeof parsed.armor === 'number') this.armor = parsed.armor;
      if (Array.isArray(parsed.inventory)) {
        for (const item of this.inventory) {
          const saved = parsed.inventory.find((x: InventoryItem) => x.id === item.id);
          if (saved && typeof saved.count === 'number') item.count = saved.count;
        }
      }
      if (parsed.ammoState) {
        this.ammoState = { ...this.ammoState, ...parsed.ammoState };
      }
      if (typeof parsed.completedJobs === 'number') this.completedJobs = parsed.completedJobs;
      if (typeof parsed.gangRep === 'number') this.gangRep = parsed.gangRep;
      if (Array.isArray(parsed.ownedTurfs)) {
        for (const t of this.turfZones) {
          if (parsed.ownedTurfs.includes(t.id)) t.owner = 'TG';
        }
      }
      if (typeof parsed.mpPlayerName === 'string' && parsed.mpPlayerName.trim()) {
        this.mpPlayerName = parsed.mpPlayerName.trim().slice(0, 24);
      }
      if (typeof parsed.mpGangTag === 'string') {
        this.mpGangTag = parsed.mpGangTag.trim().slice(0, 8) || 'TG';
      }
      if (Array.isArray(parsed.ownedPropertyIds)) {
        for (const prop of this.properties) {
          prop.owned = parsed.ownedPropertyIds.includes(prop.id);
        }
      }
      if (typeof parsed.spawnPropertyId === 'string') {
        this.spawnPropertyId = parsed.spawnPropertyId;
      }
      if (typeof parsed.equippedOutfit === 'string') {
        this.equippedOutfit = parsed.equippedOutfit as PlayerOutfitId;
      }
      if (parsed.protagonist === 'sadik' || parsed.protagonist === 'nadia') {
        this.protagonist = parsed.protagonist;
      }
      if (parsed.vehicleUpgrades && typeof parsed.vehicleUpgrades === 'object') {
        this.savedVehicleUpgrades = parsed.vehicleUpgrades;
      }
      if (parsed.heistProgress && typeof parsed.heistProgress === 'object') {
        this.heist.setup1Done = !!parsed.heistProgress.setup1Done;
        this.heist.setup2Done = !!parsed.heistProgress.setup2Done;
        this.heist.completedHeists = Number(parsed.heistProgress.completedHeists) || 0;
        if (this.heist.setup1Done && this.heist.setup2Done) {
          this.heist.stage = 'ready_finale';
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private saveProgress(): void {
    try {
      const vehicleUpgrades: Record<string, VehicleUpgradeState> = {};
      for (const v of this.vehicles) {
        if (!v.aiDriven) {
          vehicleUpgrades[v.spec.id] = v.upgrades;
        }
      }
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          cash: this.cash,
          bank: this.bank,
          health: Math.round(this.health),
          armor: Math.round(this.armor),
          inventory: this.inventory.map((i) => ({ id: i.id, count: i.count })),
          ammoState: this.ammoState,
          completedJobs: this.completedJobs,
          gangRep: this.gangRep,
          ownedTurfs: this.turfZones.filter((t) => t.owner === 'TG').map((t) => t.id),
          mpPlayerName: this.mpPlayerName,
          mpGangTag: this.mpGangTag,
          ownedPropertyIds: this.properties.filter((p) => p.owned).map((p) => p.id),
          spawnPropertyId: this.spawnPropertyId,
          equippedOutfit: this.equippedOutfit,
          protagonist: this.protagonist,
          vehicleUpgrades,
          heistProgress: {
            setup1Done: this.heist.setup1Done,
            setup2Done: this.heist.setup2Done,
            completedHeists: this.heist.completedHeists,
          },
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.onContextLostChange?.(true);
  };

  private handleContextRestored = () => {
    this.onContextLostChange?.(false);
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private showBanner(msg: string, durationMs = 4200): void {
    this.statusBanner = msg;
    this.statusBannerUntil = performance.now() + durationMs;
  }

  public getWorldData() {
    return {
      buildings: this.world.minimapBuildings,
      roads: this.world.minimapRoads,
    };
  }

  public setInput(partial: Partial<ControlInput>): void {
    Object.assign(this.input, partial);
  }

  public addCameraOrbit(deltaX: number, deltaY: number): void {
    if (this.activeVehicle) {
      this.camYawOffset -= deltaX * 0.0055;
    } else {
      this.onFootCamYaw -= deltaX * 0.0055;
    }
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + deltaY * 0.004, 0.08, 1.05);
  }

  public unlockAudio(): void {
    this.audio.unlock();
  }

  public setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  public isMuted(): boolean {
    return this.audio.isMuted();
  }

  public setGpsTarget(target: GpsTarget | null): void {
    this.gpsTarget = target;
    if (target) {
      this.showBanner(`GPS রুট সেট করা হয়েছে: ${target.name}`, 3000);
    }
    this.emitHud();
  }

  public depositCash(amount: number): void {
    const amt = Math.min(this.cash, Math.max(0, amount));
    if (amt <= 0) return;
    this.cash -= amt;
    this.bank += amt;
    this.audio.playCashReward();
    this.saveProgress();
    this.emitHud();
  }

  public withdrawCash(amount: number): void {
    const amt = Math.min(this.bank, Math.max(0, amount));
    if (amt <= 0) return;
    this.bank -= amt;
    this.cash += amt;
    this.audio.playCashReward();
    this.saveProgress();
    this.emitHud();
  }

  public callMechanic(): void {
    this.audio.unlock();
    if (this.activeVehicle) {
      if (this.cash < 400) {
        this.showBanner('রিপেয়ার ও ফুয়েল ভর্তির জন্য ৳400 লাগবে!', 3000);
        return;
      }
      this.cash -= 400;
      this.activeVehicle.health = 100;
      this.activeVehicle.fuel = 100;
      this.audio.playCashReward();
      this.showBanner(`${this.activeVehicle.spec.name} ফুল রিপেয়ার ও রিফুয়েল করা হয়েছে (-৳400)`, 3500);
      this.saveProgress();
      this.emitHud();
      return;
    }

    if (this.cash < 500) {
      this.showBanner('গাড়ি গ্যারেজ থেকে আনতে ৳500 লাগবে!', 3000);
      return;
    }
    const prado = this.vehicles[0];
    if (prado) {
      this.cash -= 500;
      prado.x = this.playerX + 3.2;
      prado.z = this.playerZ;
      prado.speed = 0;
      prado.health = 100;
      prado.fuel = 100;
      prado.group.position.set(prado.x, 0, prado.z);
      this.audio.playHorn();
      this.showBanner(`গ্যারেজ থেকে ${prado.spec.name} ডেলিভারি দেওয়া হয়েছে (-৳500)`, 3500);
      this.saveProgress();
      this.emitHud();
    }
  }

  public useInventoryItem(id: InventoryItemId): void {
    const item = this.inventory.find((i) => i.id === id);
    if (!item || item.count <= 0) return;

    item.count -= 1;
    if (id === 'tea') {
      this.hunger = Math.min(100, this.hunger + 30);
      this.thirst = Math.min(100, this.thirst + 25);
      this.showBanner('গরম চা ও বিস্কুট খেয়েছেন (+Hunger/Thirst)', 2600);
    } else if (id === 'water') {
      this.thirst = Math.min(100, this.thirst + 45);
      this.showBanner('পানি পান করেছেন (+45 Thirst)', 2600);
    } else if (id === 'bandage') {
      this.health = Math.min(100, this.health + 35);
      this.showBanner('ব্যান্ডেজ ব্যবহার করা হয়েছে (+35 Health)', 2600);
    } else if (id === 'armor') {
      this.armor = Math.min(100, this.armor + 60);
      this.showBanner('কেভলার আর্মার পরা হয়েছে (+60 Armor)', 2600);
    } else if (id === 'ammo_pack') {
      this.ammoState.pistol.reserve += 36;
      this.ammoState.smg.reserve += 90;
      this.ammoState.shotgun.reserve += 16;
      this.showBanner('সব অস্ত্রের গুলি রিফিল করা হয়েছে!', 2800);
    }
    this.audio.playDoorClick();
    this.saveProgress();
    this.emitHud();
  }

  public buyInventoryItem(id: InventoryItemId): void {
    const item = this.inventory.find((i) => i.id === id);
    if (!item) return;
    if (this.cash < item.price) {
      this.showBanner(`পর্যাপ্ত ক্যাশ নেই (দাম ৳${item.price})`, 2600);
      return;
    }
    this.cash -= item.price;
    item.count += 1;
    this.audio.playCashReward();
    this.showBanner(`${item.name} কেনা হয়েছে (-৳${item.price})`, 2600);
    this.saveProgress();
    this.emitHud();
  }

  public startJob(kind: JobKind): void {
    this.audio.unlock();
    const spots: { name: string; x: number; z: number }[] = [
      { name: 'Swapno SuperShop', x: -14.2, z: 38 },
      { name: 'Banani Rd 11', x: 4.5, z: -82 },
      { name: 'Dhanmondi 27', x: -66, z: 4.6 },
      { name: 'Mirpur Rd Crossing', x: 66, z: -4.6 },
      { name: 'Motijheel C/A', x: 4.8, z: 82 },
    ];
    const pickA = spots[Math.floor(Math.random() * spots.length)];
    const otherSpots = spots.filter((s) => s.name !== pickA.name);
    const pickB = otherSpots[Math.floor(Math.random() * otherSpots.length)];

    if (kind === 'cng_ride') {
      this.activeJob = {
        kind,
        title: 'CNG / Ride Share',
        stage: 'pickup',
        targetName: `যাত্রী পিকআপ (${pickA.name})`,
        targetX: pickA.x,
        targetZ: pickA.z,
        reward: 2600,
        progress: 0,
      };
      this.jobDropTarget = pickB;
      this.jobBeaconMat.color.setHex(0x22c55e);
      this.showBanner(`রাইড রিকোয়েস্ট: ${pickA.name} থেকে যাত্রী তুলে নিন!`, 4000);
    } else if (kind === 'paramedic') {
      this.activeJob = {
        kind,
        title: 'DMCH Paramedic',
        stage: 'pickup',
        targetName: `আহত রোগী (${pickA.name})`,
        targetX: pickA.x,
        targetZ: pickA.z,
        reward: 4500,
        progress: 0,
      };
      this.jobDropTarget = { name: 'Dhaka Medical Hospital', x: 14.5, z: 38 };
      this.jobBeaconMat.color.setHex(0xef4444);
      this.showBanner(`জরুরি কল: ${pickA.name}-এ আহত রোগীকে চিকিৎসা দিন!`, 4200);
    } else if (kind === 'delivery') {
      this.activeJob = {
        kind,
        title: 'Dhaka Food Delivery',
        stage: 'pickup',
        targetName: 'চা-নাস্তা পিকআপ (Gulshan Tong)',
        targetX: -14.2,
        targetZ: -12.0,
        reward: 1900,
        progress: 0,
      };
      this.jobDropTarget = pickB;
      this.jobBeaconMat.color.setHex(0xf59e0b);
      this.showBanner('অর্ডার রেডি! Gulshan Tea Tong থেকে পার্সেল তুলে নিন।', 4000);
    } else {
      this.activeJob = {
        kind,
        title: 'DMP City Patrol',
        stage: 'pickup',
        targetName: `চেকপয়েন্ট ১ (${pickA.name})`,
        targetX: pickA.x,
        targetZ: pickA.z,
        reward: 3600,
        progress: 0,
      };
      this.jobDropTarget = { name: 'DMP Gulshan Thana', x: 44, z: 38 };
      this.jobBeaconMat.color.setHex(0x3b82f6);
      this.showBanner(`DMP প্যাট্রোল শুরু: ${pickA.name} চেকপয়েন্টে যান!`, 4000);
    }

    this.audio.playDoorClick();
    this.emitHud();
  }

  public cancelJob(): void {
    if (!this.activeJob) return;
    this.activeJob = null;
    this.jobDropTarget = null;
    this.jobBeaconGroup.visible = false;
    this.showBanner('চলমান ডিউটি/মিশন বাতিল করা হয়েছে।', 2600);
    this.emitHud();
  }

  public interactServiceNpc(): void {
    this.audio.unlock();
    const npc = this.findNearestServiceNpc(4.2);
    if (!npc) return;

    const now = performance.now();

    if (npc.role === 'doctor' || npc.role === 'nurse') {
      const fee = this.cash >= 300 ? 300 : 0;
      this.cash -= fee;
      this.health = 100;
      this.stamina = 100;
      this.audio.playCashReward();
      const spoken =
        npc.role === 'doctor'
          ? 'ড্রেসিং আর স্যালাইন দিয়ে দিলাম, এখন একদম সুস্থ হয়ে যাবেন!'
          : 'প্রেশার চেক আর ব্যান্ডেজ করে দিলাম, নিজের যত্ন নেবেন ভাইয়া!';
      const msg = `${npc.name}: ${spoken} (-৳${fee})`;
      npc.emotion = 'happy';
      npc.emotionUntil = now + 3200;
      this.audio.speakBengali(spoken, npc.isFemale, 'happy', npc.role);
      this.showBanner(msg, 4500);
      this.saveProgress();
      this.emitHud();
    } else if (npc.role === 'shopkeeper') {
      if (this.cash < 30) {
        const warn = 'ভাই চা-বিস্কুট খেতে অন্তত ৩০ টাকা লাগবে তো!';
        npc.emotion = 'neutral';
        npc.emotionUntil = now + 2400;
        this.audio.speakBengali(warn, npc.isFemale, 'neutral', npc.role);
        this.showBanner(`মামুন চাওয়ালা: ${warn}`, 3000);
        return;
      }
      this.cash -= 30;
      this.hunger = Math.min(100, this.hunger + 35);
      this.thirst = Math.min(100, this.thirst + 40);
      this.audio.playCashReward();
      const spoken = 'এই নিন গরম খাঁটি দুধ চা আর মচমচে বিস্কুট মামা!';
      npc.emotion = 'happy';
      npc.emotionUntil = now + 3200;
      this.audio.speakBengali(spoken, npc.isFemale, 'happy', npc.role);
      this.showBanner(`মামুন চাওয়ালা: ${spoken} (-৳30)`, 3500);
      this.saveProgress();
      this.emitHud();
    } else if (npc.role === 'dealer') {
      if (this.cash < 800) {
        const warn = 'ফুল অ্যামো প্যাক নিতে ৮০০ টাকা লাগবে বস!';
        npc.emotion = 'neutral';
        npc.emotionUntil = now + 2400;
        this.audio.speakBengali(warn, npc.isFemale, 'neutral', npc.role);
        this.showBanner(`রকি ডিলার: ${warn}`, 3000);
        return;
      }
      this.cash -= 800;
      this.ammoState.pistol.reserve += 48;
      this.ammoState.smg.reserve += 120;
      this.ammoState.shotgun.reserve += 24;
      this.armor = Math.min(100, this.armor + 40);
      this.audio.playCashReward();
      const spoken = 'ফুল অ্যামো বক্স আর কেভলার আর্মার প্লেট দিয়ে দিলাম!';
      npc.emotion = 'happy';
      npc.emotionUntil = now + 3200;
      this.audio.speakBengali(spoken, npc.isFemale, 'happy', npc.role);
      this.showBanner(`রকি ডিলার: ${spoken} (-৳800)`, 3800);
      this.saveProgress();
      this.emitHud();
    }
  }

  public selectWeapon(weapon: WeaponId): void {
    this.audio.unlock();
    this.equippedWeapon = weapon;
    this.reloadingUntil = 0;
    this.player.weaponMeshes.pistol.visible = weapon === 'pistol';
    this.player.weaponMeshes.smg.visible = weapon === 'smg';
    this.player.weaponMeshes.shotgun.visible = weapon === 'shotgun';
    this.audio.playWeaponClick();
    this.emitHud();
  }

  public cycleRadioStation(): void {
    this.audio.unlock();
    const order: RadioStationId[] = ['off', 'dhaka_bass', 'bangla_rock', 'vice_wave', 'talk_dhaka'];
    const nextIdx = (order.indexOf(this.radioStation) + 1) % order.length;
    this.radioStation = order[nextIdx];
    this.audio.setRadioStation(this.radioStation);
    const labels: Record<RadioStationId, string> = {
      off: 'Radio Off',
      dhaka_bass: 'Dhaka Bass FM (Trap)',
      bangla_rock: 'Bangla Rock 94.6',
      vice_wave: 'Padma Chill Wave (GTA 6)',
      talk_dhaka: 'Talk Radio Dhaka 99.0',
    };
    this.showBanner(`📻 ${labels[this.radioStation]}`, 2400);
    this.emitHud();
  }

  public switchProtagonist(target?: ProtagonistId): void {
    if (this.lifeState !== 'alive') return;
    this.audio.unlock();
    const next: ProtagonistId = target ?? (this.protagonist === 'sadik' ? 'nadia' : 'sadik');
    if (next === this.protagonist && target) return;
    this.protagonist = next;
    this.switchingUntil = performance.now() + 950;
    applyPlayerProtagonist(this.player, next, this.equippedOutfit);
    this.audio.playWeaponClick();
    if (next === 'nadia') {
      if (this.mpPlayerName === 'BOSS Sadik') this.mpPlayerName = 'Nadia (Lucia)';
      const line = 'আমি নাদিয়া! ঢাকা শহরের রাস্তা আজ আমাদের দখলে থাকবে!';
      this.audio.speakBengali(line, true, 'happy', 'gang');
      this.showBanner('Character Switched: Nadia Rahman (GTA 6 Duo)', 3200);
    } else {
      if (this.mpPlayerName === 'Nadia (Lucia)') this.mpPlayerName = 'BOSS Sadik';
      const line = 'আমি সাদিক বলছি! মিশন শুরু করার জন্য একদম রেডি!';
      this.audio.speakBengali(line, false, 'happy', 'gang');
      this.showBanner('Character Switched: BOSS Sadik (TG Leader)', 3200);
    }
    this.saveProgress();
    this.emitHud();
  }

  private pushSocialPost(
    author: string,
    handle: string,
    caption: string,
    tag: string,
    highlight = true
  ): void {
    const post: SocialPost = {
      id: `soc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author,
      handle,
      caption,
      tag,
      likes: 120 + Math.floor(Math.random() * 880),
      timeAgo: 'Just now',
      highlight,
    };
    this.socialFeed = [post, ...this.socialFeed.slice(0, 14)];
  }

  private triggerPoliceDispatch(callout: string): void {
    const now = performance.now();
    if (now - this.lastDispatchAt < 6500) return;
    this.lastDispatchAt = now;
    this.policeDispatchBanner = callout;
    this.policeDispatchUntil = now + 5200;
    this.audio.playPoliceDispatchSpeech(callout);
  }

  private triggerAmbientNpcReaction(
    tone: 'panic' | 'angry' | 'casual',
    specificNpc?: NpcRig
  ): void {
    const now = performance.now();
    if (now - this.lastAmbientVoiceAt < 3600) return;

    let npc = specificNpc;
    if (!npc) {
      let bestDistSq = 18 * 18;
      for (const n of this.npcs) {
        if (!n.alive || n.isHostage) continue;
        const dSq = (n.x - this.playerX) ** 2 + (n.z - this.playerZ) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          npc = n;
        }
      }
    }
    if (!npc) return;

    this.lastAmbientVoiceAt = now;
    const panicLines = [
      'ওরে বাবারে! গুলির শব্দ! সবাই তাড়াতাড়ি সরে যান!',
      'হ্যালো ৯৯৯! এখানে গোলাগুলি হচ্ছে, পুলিশ পাঠান!',
      'দোহাই লাগে গুলি করবেন না! আমি পালিয়ে যাচ্ছি!',
    ];
    const angryLines = [
      'আরে মিয়া! চোখ কই?! ধাক্কা মারলি কেন রাস্তায়?!',
      'ওই! কার গাড়ির সামনে পড়ছিস দেখে হাঁটতে পারিস না?!',
      'কী সমস্যা আপনার? রাস্তা কি নিজের বাপের নাকি?!',
    ];
    const casualLines = [
      'ভাই গাড়িটা তো দারুণ লাগছে! কোথায় মডিফাই করালেন?',
      'আজ গুলশানের রাস্তায় জ্যাম একটু কম আছে দেখছি!',
    ];

    const pool = tone === 'panic' ? panicLines : tone === 'angry' ? angryLines : casualLines;
    const text = pool[Math.floor(Math.random() * pool.length)];
    const emotion = tone === 'panic' ? 'cry' : tone === 'angry' ? 'angry' : 'happy';

    npc.emotion = emotion;
    npc.emotionUntil = now + 3200;
    this.ambientSpeech = {
      speaker: npc.name,
      text,
      isFemale: npc.isFemale,
      tone,
    };
    this.ambientSpeechUntil = now + 4200;
    this.audio.speakBengali(text, npc.isFemale, emotion, 'civilian');
  }

  public reloadWeapon(): void {
    if (this.equippedWeapon === 'fists') return;
    const spec = WEAPON_CATALOG[this.equippedWeapon];
    const ammo = this.ammoState[this.equippedWeapon];
    if (ammo.mag >= spec.magSize || ammo.reserve <= 0 || this.reloadingUntil > performance.now()) {
      return;
    }
    this.reloadingUntil = performance.now() + 1100;
    this.emitHud();
  }

  public toggleHostage(): void {
    this.audio.unlock();
    if (this.activeVehicle) return;

    if (this.hostageNpc) {
      const npc = this.hostageNpc;
      npc.isHostage = false;
      npc.leftArmPivot.rotation.x = 0;
      npc.rightArmPivot.rotation.x = 0;
      npc.panicked = true;
      npc.panicTimer = 8;
      this.hostageNpc = null;
      this.hostageDialogue = null;

      if (this.wantedStars > 0) {
        this.policeHoldFireUntil = performance.now() + 10000;
        this.wantedStars = Math.max(0, this.wantedStars - 1);
        this.showBanner('হোস্টেজ ছেড়ে দেওয়ায় পুলিশ ১০ সেকেন্ড ফায়ার বন্ধ রেখেছে!', 4500);
      } else {
        this.showBanner(`${npc.name}-কে ছেড়ে দেওয়া হয়েছে।`, 2800);
      }
      this.emitHud();
      return;
    }

    const nearest = this.findNearestCivilian(3.8);
    if (!nearest) return;

    nearest.isHostage = true;
    nearest.panicked = false;
    this.hostageNpc = nearest;
    const reply = findRoleChatReply('hostage', '');
    this.hostageDialogue = reply.text;
    this.hostageDialogueTimer = 5.0;
    nearest.emotion = reply.emotion;
    nearest.emotionUntil = performance.now() + 3400;
    this.audio.playDoorClick();
    this.audio.speakBengali(reply.text, nearest.isFemale, reply.emotion, 'hostage');
    this.showBanner(`হোস্টেজ ধরা হয়েছে: ${nearest.name}`, 3200);
    this.emitHud();
  }

  public cycleHostageDialogue(): void {
    if (!this.hostageNpc) return;
    const reply = findRoleChatReply('hostage', '');
    this.hostageDialogue = reply.text;
    this.hostageDialogueTimer = 5.5;
    this.hostageNpc.emotion = reply.emotion;
    this.hostageNpc.emotionUntil = performance.now() + 3400;
    this.audio.speakBengali(reply.text, this.hostageNpc.isFemale, reply.emotion, 'hostage');
    this.emitHud();
  }

  public askRoleChat(
    role: ChatRole,
    question: string,
    voiceFemaleOverride?: boolean
  ): RoleChatReply {
    this.audio.unlock();
    const reply = findRoleChatReply(role, question);
    const now = performance.now();

    // Find closest matching NPC to animate face & body emotion
    let targetNpc: NpcRig | null = null;
    if (role === 'hostage' && this.hostageNpc) {
      targetNpc = this.hostageNpc;
    } else {
      let bestDistSq = Infinity;
      for (const npc of this.npcs) {
        if (!npc.alive) continue;
        const roleMatch =
          npc.role === role ||
          ((role === 'police' || role === 'gang' || role === 'hostage') && npc.role === 'civilian');
        if (!roleMatch) continue;
        const dx = npc.x - this.playerX;
        const dz = npc.z - this.playerZ;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          targetNpc = npc;
        }
      }
    }

    const useFemaleVoice =
      typeof voiceFemaleOverride === 'boolean'
        ? voiceFemaleOverride
        : role === 'hostage' && this.hostageNpc
        ? this.hostageNpc.isFemale
        : reply.isFemaleVoice;

    const speakerName =
      role === 'hostage' && this.hostageNpc
        ? this.hostageNpc.name
        : !useFemaleVoice && role === 'civilian'
        ? 'করিম চাচা'
        : useFemaleVoice && role === 'doctor'
        ? 'ডা. সাদিয়া'
        : reply.speakerName;

    const resolvedReply: RoleChatReply = {
      ...reply,
      speakerName,
      isFemaleVoice: useFemaleVoice,
    };

    if (targetNpc) {
      targetNpc.emotion = resolvedReply.emotion;
      targetNpc.emotionUntil = now + 3800;
    }

    this.audio.speakBengali(resolvedReply.text, useFemaleVoice, resolvedReply.emotion, role);
    this.showBanner(`${speakerName}: ${resolvedReply.text}`, 4500);
    this.emitHud();
    return resolvedReply;
  }

  public playEmotionVoice(emotion: 'laugh' | 'cry', isFemale: boolean): void {
    this.audio.unlock();
    const now = performance.now();
    if (emotion === 'laugh') {
      this.audio.playLaugh(isFemale);
    } else {
      this.audio.playCry(isFemale);
    }

    const nearNpc = this.findNearestServiceNpc(6.0) ?? this.hostageNpc ?? this.findNearestCivilian(6.0);
    if (nearNpc) {
      nearNpc.emotion = emotion;
      nearNpc.emotionUntil = now + 3000;
    }
  }

  public speakLine(
    text: string,
    isFemale: boolean,
    emotion: 'neutral' | 'laugh' | 'cry' | 'happy' | 'angry' = 'neutral',
    role?: ChatRole
  ): void {
    this.audio.unlock();
    this.audio.speakBengali(text, isFemale, emotion, role);
  }

  public sendServerChat(channel: MpChatChannel, text: string): void {
    const clean = text.trim();
    if (!clean) return;
    if (clean === '/passive') {
      this.togglePassiveMode();
      return;
    }
    this.mp?.sendChat(channel, clean);
  }

  public updateProfile(name: string, gangTag: string): void {
    const cleanName = name.trim().slice(0, 24) || 'Citizen';
    const cleanTag = gangTag.trim().slice(0, 8) || 'RP';
    this.mpPlayerName = cleanName;
    this.mpGangTag = cleanTag;
    this.saveProgress();
    this.mp?.updateJoinProfile(
      this.mpPlayerName,
      this.mpGangTag,
      this.activeJob ? this.activeJob.title : 'Citizen',
      this.playerX,
      this.playerZ,
      this.playerHeading,
      this.passiveMode
    );
    this.showBanner(`প্রোফাইল আপডেট হয়েছে: [${this.mpGangTag}] ${this.mpPlayerName}`, 3000);
    this.emitHud();
  }

  public togglePassiveMode(): void {
    if (!this.passiveMode && this.wantedStars > 0) {
      this.showBanner('Wanted Star থাকা অবস্থায় Passive Mode চালু করা যাবে না!', 3200);
      return;
    }
    this.passiveMode = !this.passiveMode;
    this.player.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material;
        if (mat && !Array.isArray(mat) && 'opacity' in mat) {
          mat.transparent = this.passiveMode;
          mat.opacity = this.passiveMode ? 0.48 : 1.0;
        }
      }
    });
    this.audio.playDoorClick();
    this.showBanner(
      this.passiveMode
        ? 'Passive Mode চালু — কেউ আপনাকে আক্রমণ করতে পারবে না।'
        : 'Passive Mode বন্ধ করা হয়েছে।',
      3200
    );
    this.emitHud();
  }

  public startRobbery(): void {
    this.audio.unlock();
    if (this.activeVehicle || this.activeRobbery) return;
    if (this.passiveMode) {
      this.showBanner('Passive Mode-এ ডাকাতি করা যাবে না!', 2800);
      return;
    }

    const now = performance.now();
    const spot = this.findNearestRobberySpot(4.2);
    if (!spot) return;

    if (spot.cooldownUntil > now) {
      const secs = Math.ceil((spot.cooldownUntil - now) / 1000);
      this.showBanner(`${spot.name}-এ অ্যালার্ম লক আছে (${secs}s অপেক্ষা করুন)`, 3000);
      this.emitHud();
      return;
    }

    this.activeRobbery = spot;
    this.robberyElapsed = 0;
    this.alarmTimer = 0;
    this.wantedStars = Math.max(this.wantedStars, spot.wantedStars);
    this.evadeTimer = 0;
    this.audio.playAlarmBeep();
    this.mp?.sendRobberyAlert(spot.name);
    const { streetName } = this.getStreetZone();
    this.triggerPoliceDispatch(
      `সকল ইউনিট! কোড-৩! ${streetName}-এর ${spot.name}-এ ডাকাতি শুরু হয়েছে!`
    );
    this.pushSocialPost(
      'Dhaka Live News',
      '@dhaka_breaking',
      `🚨 এইমাত্র ${spot.name}-এ অস্ত্রের মুখে ডাকাতির চেষ্টা! DMP ঘিরে ফেলেছে!`,
      '#CrimeAlert'
    );
    this.showBanner(`অ্যালার্ম বেজে উঠেছে! ${spot.name} লুট চলছে...`, 4000);
    this.emitHud();
  }

  private spendFunds(cost: number): boolean {
    if (cost <= 0) return true;
    if (this.cash + this.bank < cost) return false;
    if (this.cash >= cost) {
      this.cash -= cost;
    } else {
      const rem = cost - this.cash;
      this.cash = 0;
      this.bank -= rem;
    }
    return true;
  }

  public applyVehicleUpgrade(partial: Partial<VehicleUpgradeState>, cost: number, repair = false): boolean {
    this.audio.unlock();
    const targetVeh = this.activeVehicle ?? this.vehicles[0];
    if (!targetVeh) return false;

    if (!this.spendFunds(cost)) {
      this.showBanner(`এই আপগ্রেডের জন্য ৳${cost.toLocaleString()} প্রয়োজন!`, 3000);
      return false;
    }

    const nextUpgrades: VehicleUpgradeState = {
      ...targetVeh.upgrades,
      ...partial,
    };
    applyVehicleUpgradesToRig(targetVeh, nextUpgrades);
    this.savedVehicleUpgrades[targetVeh.spec.id] = nextUpgrades;
    if (repair) {
      targetVeh.health = 100;
      targetVeh.fuel = 100;
    }
    this.audio.playSprayMod();
    if (partial.paintName || partial.neon || partial.turbo) {
      this.pushSocialPost(
        'Dhaka Customs Hub',
        '@dhaka_customs',
        `🔥 ${this.mpPlayerName} তার ${targetVeh.spec.name}-এ নতুন ${nextUpgrades.paintName} ও টিউনিং লাগালো!`,
        '#LSCustoms',
        false
      );
    }
    this.showBanner(
      `${targetVeh.spec.name} টিউন আপডেট হয়েছে${cost > 0 ? ` (-৳${cost.toLocaleString()})` : ''}`,
      3200
    );
    this.saveProgress();
    this.emitHud();
    return true;
  }

  public buyProperty(propertyId: string): void {
    this.audio.unlock();
    const prop = this.properties.find((p) => p.id === propertyId);
    if (!prop || prop.owned) return;
    if (!this.spendFunds(prop.price)) {
      this.showBanner(`${prop.name} কিনতে মোট ৳${prop.price.toLocaleString()} (Cash + Bank) লাগবে!`, 3400);
      return;
    }
    prop.owned = true;
    if (!this.spawnPropertyId) {
      this.spawnPropertyId = prop.id;
    }
    this.audio.playCashReward();
    this.showBanner(
      `${prop.name} কেনা সম্পন্ন! ${prop.hasHeistRoom ? 'Heist Planning Room ও ১০-কার গ্যারেজ আনলক হয়েছে!' : '২-কার গ্যারেজ ও সেফহাউস আনলক হয়েছে!'}`,
      4800
    );
    this.saveProgress();
    this.emitHud();
  }

  public setSpawnProperty(propertyId: string | null): void {
    if (propertyId) {
      const prop = this.properties.find((p) => p.id === propertyId && p.owned);
      if (!prop) return;
      this.spawnPropertyId = prop.id;
      this.showBanner(`Spawn লোকেশন সেট করা হয়েছে: ${prop.name}`, 2800);
    } else {
      this.spawnPropertyId = null;
    }
    this.saveProgress();
    this.emitHud();
  }

  public restAtApartment(propertyId: string): void {
    this.audio.unlock();
    const prop = this.properties.find((p) => p.id === propertyId && p.owned);
    if (!prop) return;
    this.health = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.stamina = 100;
    this.audio.playCashReward();
    this.showBanner(`${prop.name}-এ বিশ্রাম ও রিফ্রেশমেন্ট সম্পন্ন (HP/Hunger 100%)`, 3200);
    this.saveProgress();
    this.emitHud();
  }

  public equipOutfit(outfit: PlayerOutfitId): void {
    this.audio.unlock();
    this.equippedOutfit = outfit;
    applyPlayerProtagonist(this.player, this.protagonist, outfit);
    this.audio.playDoorClick();
    const names: Record<PlayerOutfitId, string> = {
      tg_boss: 'TG Boss Tactical Black',
      dmp_tac: 'DMP Blue Tactical',
      dhaka_panjabi: 'Dhaka Festive Panjabi',
      racer_red: 'Redline Street Racer',
    };
    this.showBanner(`আউটফিট পরিবর্তন হয়েছে: ${names[outfit]}`, 2800);
    this.saveProgress();
    this.emitHud();
  }

  public summonGarageVehicle(vehicleId: string): void {
    this.audio.unlock();
    const ownedCount = this.properties.filter((p) => p.owned).length;
    if (ownedCount === 0) {
      this.showBanner('প্রথমে Dynasty 8 থেকে একটি অ্যাপার্টমেন্ট ও গ্যারেজ কিনুন!', 3200);
      return;
    }
    const veh = this.vehicles.find((v) => v.spec.id === vehicleId && !v.aiDriven);
    if (!veh) return;
    const spawnDist = 3.8;
    const fx = this.playerX + Math.sin(this.playerHeading + Math.PI / 2) * spawnDist;
    const fz = this.playerZ + Math.cos(this.playerHeading + Math.PI / 2) * spawnDist;
    const safe = this.resolveCircleCollisions(fx, fz, 1.8);
    veh.x = safe.x;
    veh.z = safe.z;
    veh.speed = 0;
    veh.health = 100;
    veh.fuel = 100;
    veh.group.position.set(veh.x, 0, veh.z);
    this.audio.playHorn();
    this.showBanner(`আপনার ১০-কার গ্যারেজ থেকে ${veh.spec.name} ডেলিভারি দেওয়া হয়েছে!`, 3400);
    this.emitHud();
  }

  public startHeistSetup(step: 1 | 2): void {
    this.audio.unlock();
    const hasHeistApt = this.properties.some((p) => p.owned && p.hasHeistRoom);
    if (!hasHeistApt) {
      this.showBanner('Heist প্ল্যানিং রুম আনলক করতে গুলশান/ধানমন্ডির High-End Apartment কিনুন!', 4000);
      return;
    }
    this.heistPickupPhase = 'outbound';
    if (step === 1) {
      this.heist.stage = 'setup_hack_van';
      this.heist.targetName = 'Mirpur Rd Security Van';
      this.heist.targetX = 68;
      this.heist.targetZ = -4.6;
      this.heistBeaconMat.color.setHex(0x38bdf8);
      this.showBanner('Heist Setup 1: মিরপুর রোড থেকে DMP হ্যাকিং ডিভাইস ভ্যান চুরি করুন!', 4500);
    } else {
      this.heist.stage = 'setup_kuruma';
      this.heist.targetName = 'Banani Armored Kuruma';
      this.heist.targetX = 4.5;
      this.heist.targetZ = -82;
      this.heistBeaconMat.color.setHex(0xf59e0b);
      this.showBanner('Heist Setup 2: বনানী গ্যারেজ থেকে Armored Getaway কার নিয়ে আসুন!', 4500);
    }
    this.emitHud();
  }

  public startBankHeistFinale(): void {
    this.audio.unlock();
    if (this.passiveMode) {
      this.showBanner('Passive Mode চালু থাকলে Bank Heist শুরু করা যাবে না!', 3200);
      return;
    }
    if (!this.heist.setup1Done || !this.heist.setup2Done) {
      this.showBanner('প্রথমে Setup 1 ও Setup 2 মিশন সম্পন্ন করুন!', 3200);
      return;
    }
    this.heist.stage = 'finale_approach';
    this.heist.targetName = 'Dhaka Bank Vault Entrance';
    this.heist.targetX = 15.2;
    this.heist.targetZ = -38;
    this.heistBeaconMat.color.setHex(0xef4444);
    this.audio.playAlarmBeep();
    this.mp?.sendRobberyAlert('Dhaka Bank Heist Finale');
    this.showBanner('The Dhaka Bank Job শুরু হয়েছে! ঢাকা ব্যাংক ভল্টে প্রবেশ করুন!', 4800);
    this.emitHud();
  }

  public advanceHeistMinigame(nextStage: 'finale_drill' | 'finale_escape'): void {
    this.audio.unlock();
    if (nextStage === 'finale_drill') {
      this.heist.stage = 'finale_drill';
      this.audio.playCashReward();
      this.showBanner('ভল্টের সিকিউরিটি হ্যাক সফল! এবার Thermal Drill চালান!', 4200);
    } else {
      this.heist.stage = 'finale_escape';
      this.heist.targetName = 'Banani Bridge Extraction Point';
      this.heist.targetX = 0;
      this.heist.targetZ = -125;
      this.wantedStars = Math.max(this.wantedStars, 4);
      this.evadeTimer = 0;
      this.heistBeaconMat.color.setHex(0x10b981);
      this.audio.playAlarmBeep();
      this.mp?.sendRobberyAlert('Dhaka Bank Vault Breached (৳2,00,000 Loot!)');
      this.showBanner('ভল্ট ভাঙা হয়েছে! ৳2,00,000 ক্যাশ নিয়ে বনানী ব্রিজ Extraction পয়েন্টে পালান!', 5500);
    }
    this.emitHud();
  }

  public playHeistDrillTick(heatRatio: number): void {
    this.audio.playDrillPulse(heatRatio);
  }

  public cancelHeistMission(): void {
    this.heist.stage = this.heist.setup1Done && this.heist.setup2Done ? 'ready_finale' : 'idle';
    this.heistBeaconGroup.visible = false;
    this.emitHud();
  }

  public setTimePreset(preset: TimePreset): void {
    this.timePreset = preset;
    this.world.updateLighting(preset);
    if (preset === 'day') this.gameMinutes = 12 * 60 + 24;
    else if (preset === 'sunset') this.gameMinutes = 18 * 60 + 15;
    else this.gameMinutes = 23 * 60 + 40;
    this.headlightsOn = preset !== 'day';
    this.syncVehicleHeadlights();
    this.emitHud();
  }

  public toggleHeadlights(): void {
    this.audio.unlock();
    this.headlightsOn = !this.headlightsOn;
    this.syncVehicleHeadlights();
    this.emitHud();
  }

  public honk(): void {
    if (this.activeVehicle) {
      this.audio.playHorn();
    }
  }

  public toggleVehicle(): void {
    this.audio.unlock();
    if (this.activeVehicle) {
      const v = this.activeVehicle;
      const exitAngle = v.rotationY + Math.PI / 2;
      this.playerX = v.x + Math.sin(exitAngle) * (v.halfWidth + 1.05);
      this.playerZ = v.z + Math.cos(exitAngle) * (v.halfWidth + 1.05);
      this.playerY = 0;
      this.playerVelY = 0;
      this.playerHeading = v.rotationY + Math.PI;
      this.onFootCamYaw = this.playerHeading;
      this.player.group.visible = true;
      this.player.group.position.set(this.playerX, 0, this.playerZ);
      this.activeVehicle = null;
      this.audio.playDoorClick();
      this.audio.updateEngine(false, 0);
      this.emitHud();
      return;
    }

    const nearest = this.findNearestVehicle(4.6);
    if (nearest) {
      if (this.hostageNpc) {
        this.hostageNpc.isHostage = false;
        this.hostageNpc.leftArmPivot.rotation.x = 0;
        this.hostageNpc.rightArmPivot.rotation.x = 0;
        this.hostageNpc = null;
        this.hostageDialogue = null;
      }
      if (nearest.aiDriven) {
        this.triggerAmbientNpcReaction('angry');
        if (nearest.spec.kind === 'police') {
          this.wantedStars = Math.max(this.wantedStars, 2);
          this.triggerPoliceDispatch(
            '১০-৯৯! সন্দেহভাজন একজন DMP পুলিশের গাড়ি ছিনতাই করেছে!'
          );
          this.pushSocialPost(
            'Gulshan Viral Cam',
            '@gulshan_reels',
            `ভাইরে ভাই!! ${this.mpPlayerName} পুলিশের গাড়ি নিয়েই চম্পট দিছে!! 😂🚓`,
            '#DhakaGTA'
          );
        }
      }
      nearest.aiDriven = false;
      this.activeVehicle = nearest;
      this.player.group.visible = false;
      this.camYawOffset = 0;
      this.audio.playDoorClick();
      this.emitHud();
    }
  }

  private findNearestVehicle(maxDist: number): VehicleRig | null {
    let best: VehicleRig | null = null;
    let bestDistSq = maxDist * maxDist;
    for (const v of this.vehicles) {
      const dx = v.x - this.playerX;
      const dz = v.z - this.playerZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = v;
      }
    }
    return best;
  }

  private findNearestCivilian(maxDist: number): NpcRig | null {
    let best: NpcRig | null = null;
    let bestDistSq = maxDist * maxDist;
    for (const npc of this.npcs) {
      if (!npc.alive || npc.isHostage || npc.role !== 'civilian') continue;
      const dx = npc.x - this.playerX;
      const dz = npc.z - this.playerZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = npc;
      }
    }
    return best;
  }

  private findNearestServiceNpc(maxDist: number): NpcRig | null {
    let best: NpcRig | null = null;
    let bestDistSq = maxDist * maxDist;
    for (const npc of this.npcs) {
      if (!npc.alive || npc.role === 'civilian') continue;
      const dx = npc.x - this.playerX;
      const dz = npc.z - this.playerZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = npc;
      }
    }
    return best;
  }

  private findNearestRobberySpot(maxDist: number): RobberySpot | null {
    let best: RobberySpot | null = null;
    let bestDistSq = maxDist * maxDist;
    for (const spot of this.world.robberySpots) {
      const dx = spot.x - this.playerX;
      const dz = spot.z - this.playerZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = spot;
      }
    }
    return best;
  }

  private syncVehicleHeadlights(): void {
    for (const v of this.vehicles) {
      const active =
        (v === this.activeVehicle && this.headlightsOn) ||
        (v.aiDriven && this.timePreset !== 'day');
      v.headlightLeft.intensity = active ? 26 : 0;
      v.headlightRight.intensity = active ? 26 : 0;
      for (const m of v.headlightMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = active || this.timePreset !== 'day' ? 1.8 : 0.45;
      }
    }
  }

  private resolveCircleCollisions(
    x: number,
    z: number,
    radius: number
  ): { x: number; z: number; hit: boolean } {
    let nx = THREE.MathUtils.clamp(x, -165, 165);
    let nz = THREE.MathUtils.clamp(z, -165, 165);
    let hit = false;

    for (const b of this.world.colliders) {
      const closestX = THREE.MathUtils.clamp(nx, b.minX, b.maxX);
      const closestZ = THREE.MathUtils.clamp(nz, b.minZ, b.maxZ);
      const dx = nx - closestX;
      const dz = nz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq) || 0.0001;
        const overlap = radius - dist;
        if (dist > 0.001) {
          nx += (dx / dist) * overlap;
          nz += (dz / dist) * overlap;
        } else {
          const penLeft = Math.abs(nx - b.minX);
          const penRight = Math.abs(b.maxX - nx);
          const penTop = Math.abs(nz - b.minZ);
          const penBottom = Math.abs(b.maxZ - nz);
          const m = Math.min(penLeft, penRight, penTop, penBottom);
          if (m === penLeft) nx = b.minX - radius;
          else if (m === penRight) nx = b.maxX + radius;
          else if (m === penTop) nz = b.minZ - radius;
          else nz = b.maxZ + radius;
        }
      }
    }
    return { x: nx, z: nz, hit };
  }

  private triggerPanicNearby(originX: number, originZ: number, radius: number): void {
    const rSq = radius * radius;
    for (const npc of this.npcs) {
      if (!npc.alive || npc.isHostage || npc.stationary) continue;
      const dx = npc.x - originX;
      const dz = npc.z - originZ;
      if (dx * dx + dz * dz < rSq) {
        npc.panicked = true;
        npc.panicTimer = 9;
        npc.heading = Math.atan2(-dx, -dz);
      }
    }
  }

  private tryFireWeapon(now: number): void {
    if (this.activeVehicle || !this.input.firing) return;
    if (this.passiveMode) {
      if (now - this.lastFireTime > 1200) {
        this.lastFireTime = now;
        this.showBanner('Passive Mode চালু — অস্ত্র ব্যবহার বন্ধ!', 2400);
      }
      return;
    }
    const spec = WEAPON_CATALOG[this.equippedWeapon];

    if (this.reloadingUntil > 0 && now >= this.reloadingUntil) {
      const ammo = this.ammoState[this.equippedWeapon];
      const need = spec.magSize - ammo.mag;
      const take = Math.min(need, ammo.reserve);
      ammo.mag += take;
      ammo.reserve -= take;
      this.reloadingUntil = 0;
    }

    if (this.reloadingUntil > now) return;
    if (now - this.lastFireTime < spec.fireRateMs) return;

    if (this.equippedWeapon !== 'fists') {
      const ammo = this.ammoState[this.equippedWeapon];
      if (ammo.mag <= 0) {
        this.reloadWeapon();
        return;
      }
      ammo.mag -= 1;
    }

    this.lastFireTime = now;
    this.audio.playGunshot(this.equippedWeapon);
    this.playerHeading = this.onFootCamYaw;

    if (this.equippedWeapon === 'fists') {
      this.punchAnimTimer = 0.22;
      for (const npc of this.npcs) {
        if (!npc.alive || npc.isHostage || npc.stationary) continue;
        const dist = Math.hypot(npc.x - this.playerX, npc.z - this.playerZ);
        if (dist < spec.range) {
          npc.hp -= spec.damage;
          npc.panicked = true;
          npc.panicTimer = 8;
          this.hitMarkerUntil = now + 170;
          this.audio.playHitMarker();
          this.triggerAmbientNpcReaction('angry', npc);
          if (npc.hp <= 0) {
            npc.alive = false;
            npc.group.rotation.x = Math.PI / 2;
            npc.group.position.y = 0.15;
            this.wantedStars = Math.min(5, Math.max(1, this.wantedStars + 1));
            const { streetName } = this.getStreetZone();
            this.triggerPoliceDispatch(`সকল ইউনিট! ${streetName}-এ হামলার খবর পাওয়া গেছে!`);
          }
        }
      }
      return;
    }

    this.triggerPanicNearby(this.playerX, this.playerZ, 28);
    this.triggerAmbientNpcReaction('panic');
    this.muzzleLight.position.set(
      this.playerX - Math.sin(this.playerHeading) * 0.8,
      1.45,
      this.playerZ - Math.cos(this.playerHeading) * 0.8
    );
    this.muzzleLight.intensity = 6;

    const effectiveSpread = this.input.aiming ? spec.spread * 0.45 : spec.spread;
    for (let i = 0; i < spec.pellets; i++) {
      const yaw = this.playerHeading + (Math.random() - 0.5) * effectiveSpread;
      const pitch = (Math.random() - 0.5) * effectiveSpread * 0.5;
      const dirX = -Math.sin(yaw);
      const dirY = Math.sin(pitch);
      const dirZ = -Math.cos(yaw);

      const mesh = new THREE.Mesh(this.tracerGeo, this.tracerMat);
      mesh.position.set(
        this.playerX + dirX * 0.75,
        this.playerY + 1.38,
        this.playerZ + dirZ * 0.75
      );
      mesh.rotation.y = yaw;
      this.scene.add(mesh);

      this.tracers.push({
        mesh,
        vx: dirX * 95,
        vy: dirY * 95,
        vz: dirZ * 95,
        life: spec.range / 95,
        damage: spec.damage,
      });
    }
  }

  private updateTracers(dt: number): void {
    this.muzzleLight.intensity = THREE.MathUtils.damp(this.muzzleLight.intensity, 0, 22, dt);
    const now = performance.now();

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.mesh.position.x += t.vx * dt;
      t.mesh.position.y += t.vy * dt;
      t.mesh.position.z += t.vz * dt;
      t.life -= dt;

      let hit = false;
      for (const npc of this.npcs) {
        if (!npc.alive || npc.isHostage || npc.stationary) continue;
        const dx = t.mesh.position.x - npc.x;
        const dz = t.mesh.position.z - npc.z;
        if (dx * dx + dz * dz < 0.45) {
          npc.hp -= t.damage;
          npc.panicked = true;
          npc.panicTimer = 10;
          this.hitMarkerUntil = now + 180;
          this.audio.playHitMarker();
          if (npc.hp <= 0) {
            npc.alive = false;
            npc.group.rotation.x = Math.PI / 2;
            npc.group.position.y = 0.15;
            this.cash += 120;
            const prevStars = this.wantedStars;
            this.wantedStars = Math.min(5, Math.max(1, this.wantedStars + 1));
            if (this.wantedStars > prevStars) {
              const { streetName } = this.getStreetZone();
              this.triggerPoliceDispatch(
                `সকল ইউনিট, কোড-৩! ${streetName}-এ গুলির শব্দ! সন্দেহভাজনকে আটক করুন!`
              );
            }
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        for (const v of this.vehicles) {
          if (v === this.activeVehicle) continue;
          const dx = t.mesh.position.x - v.x;
          const dz = t.mesh.position.z - v.z;
          if (dx * dx + dz * dz < 3.2) {
            v.health = Math.max(15, v.health - t.damage * 0.35);
            v.aiDriven = false;
            v.speed *= 0.5;
            this.hitMarkerUntil = now + 160;
            this.audio.playHitMarker();
            hit = true;
            break;
          }
        }
      }

      if (hit || t.life <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }
  }

  private updateRobberyAndHostage(dt: number, now: number): void {
    if (this.hostageNpc) {
      const h = this.hostageNpc;
      const targetX = this.playerX + Math.cos(this.playerHeading) * 0.9 + Math.sin(this.playerHeading) * 0.85;
      const targetZ = this.playerZ - Math.sin(this.playerHeading) * 0.9 + Math.cos(this.playerHeading) * 0.85;
      h.x = THREE.MathUtils.damp(h.x, targetX, 7, dt);
      h.z = THREE.MathUtils.damp(h.z, targetZ, 7, dt);
      h.heading = this.playerHeading;
      h.leftArmPivot.rotation.x = -2.75;
      h.rightArmPivot.rotation.x = -2.75;

      const moveDist = Math.hypot(targetX - h.x, targetZ - h.z);
      if (moveDist > 0.1) {
        h.walkCycle += dt * 9;
        const swing = Math.sin(h.walkCycle) * 0.38;
        h.leftLegPivot.rotation.x = swing;
        h.rightLegPivot.rotation.x = -swing;
      } else {
        h.leftLegPivot.rotation.x = 0;
        h.rightLegPivot.rotation.x = 0;
      }
      h.group.position.set(h.x, 0, h.z);
      h.group.rotation.y = h.heading;

      this.hostageDialogueTimer -= dt;
      if (this.hostageDialogueTimer <= 0) {
        this.hostageDialogueTimer = 6.0;
        const reply = findRoleChatReply('hostage', '');
        this.hostageDialogue = reply.text;
        h.emotion = reply.emotion;
        h.emotionUntil = now + 3000;
        this.audio.speakBengali(reply.text, h.isFemale, reply.emotion, 'hostage');
      }
    }

    if (this.activeRobbery) {
      const spot = this.activeRobbery;
      const dist = Math.hypot(spot.x - this.playerX, spot.z - this.playerZ);
      if (dist > 7.5 || this.activeVehicle) {
        this.showBanner(`${spot.name} রবারি বাতিল হয়েছে — স্পট ছেড়ে চলে গেছেন!`, 3200);
        this.activeRobbery = null;
        this.robberyElapsed = 0;
        return;
      }

      const speedMult = this.hostageNpc ? 1.3 : 1.0;
      this.robberyElapsed += dt * speedMult;
      this.alarmTimer += dt;
      if (this.alarmTimer >= 1.6) {
        this.alarmTimer = 0;
        this.audio.playAlarmBeep();
      }

      if (this.robberyElapsed >= spot.durationSec) {
        const reward =
          Math.floor(Math.random() * (spot.rewardMax - spot.rewardMin + 1)) + spot.rewardMin;
        this.cash += reward;
        spot.cooldownUntil = now + 45000;
        this.activeRobbery = null;
        this.robberyElapsed = 0;
        this.audio.playCashReward();
        this.saveProgress();
        this.showBanner(`লুট সফল! +৳${reward.toLocaleString()} — DMP পুলিশ ধাওয়া করছে!`, 5000);
      }
    }
  }

  private applyNpcEmotionAnimation(npc: NpcRig, now: number): void {
    if (now < npc.emotionUntil) {
      if (npc.emotion === 'laugh') {
        const laughOsc = Math.sin(now * 0.022);
        npc.headGroup.rotation.x = -0.14 + laughOsc * 0.1;
        npc.headGroup.rotation.z = Math.sin(now * 0.011) * 0.06;
        npc.mouthMesh.scale.set(1.35, 2.2 + Math.abs(laughOsc) * 1.6, 1.2);
        npc.torso.position.y = Math.abs(laughOsc) * 0.032;
        if (!npc.isHostage) {
          npc.leftArmPivot.rotation.x = -0.35 + laughOsc * 0.14;
          npc.rightArmPivot.rotation.x = -0.45 - laughOsc * 0.14;
        }
      } else if (npc.emotion === 'cry') {
        const sobOsc = Math.sin(now * 0.018);
        npc.headGroup.rotation.x = 0.22 + sobOsc * 0.05;
        npc.headGroup.rotation.z = Math.sin(now * 0.028) * 0.08;
        npc.mouthMesh.scale.set(0.85, 1.5 + Math.abs(sobOsc) * 1.1, 1.0);
        npc.torso.position.y = -0.015 + Math.abs(sobOsc) * 0.018;
        if (!npc.isHostage) {
          npc.leftArmPivot.rotation.x = -1.65 + sobOsc * 0.08;
          npc.rightArmPivot.rotation.x = -1.65 - sobOsc * 0.08;
        }
      } else if (npc.emotion === 'happy') {
        const talkOsc = Math.abs(Math.sin(now * 0.016));
        npc.headGroup.rotation.x = Math.sin(now * 0.006) * 0.06;
        npc.headGroup.rotation.z = 0;
        npc.mouthMesh.scale.set(1.2, 1.1 + talkOsc * 1.3, 1.0);
        npc.torso.position.y = 0;
        if (!npc.isHostage && npc.stationary) {
          npc.rightArmPivot.rotation.x = -0.45 + Math.sin(now * 0.008) * 0.18;
        }
      } else {
        const talkOsc = Math.abs(Math.sin(now * 0.015));
        npc.headGroup.rotation.x = Math.sin(now * 0.005) * 0.04;
        npc.headGroup.rotation.z = 0;
        npc.mouthMesh.scale.set(1.0, 1.0 + talkOsc * 1.0, 1.0);
        npc.torso.position.y = 0;
      }
    } else {
      npc.emotion = 'neutral';
      npc.headGroup.rotation.x = 0;
      npc.headGroup.rotation.z = 0;
      npc.mouthMesh.scale.set(1, 1, 1);
      npc.torso.position.y = 0;
    }
  }

  private updateNpcs(dt: number, now: number): void {
    if (this.hostageNpc) {
      this.applyNpcEmotionAnimation(this.hostageNpc, now);
    }

    for (const npc of this.npcs) {
      if (!npc.alive || npc.isHostage) continue;

      // Stationary hospital Doctors, Nurses, Shopkeepers gently face the player when close & breathe naturally
      if (npc.stationary) {
        const dx = this.playerX - npc.x;
        const dz = this.playerZ - npc.z;
        if (dx * dx + dz * dz < 36) {
          const desired = Math.atan2(-dx, -dz);
          const diff = Math.atan2(Math.sin(desired - npc.heading), Math.cos(desired - npc.heading));
          npc.heading += diff * Math.min(1, dt * 4);
        }
        npc.group.rotation.y = npc.heading;
        npc.leftArmPivot.rotation.x = Math.sin(now * 0.002 + npc.walkCycle) * 0.04;
        npc.rightArmPivot.rotation.x = -Math.sin(now * 0.002 + npc.walkCycle) * 0.04;
        this.applyNpcEmotionAnimation(npc, now);
        continue;
      }

      if (npc.panicked) {
        npc.panicTimer -= dt;
        if (npc.panicTimer <= 0) npc.panicked = false;
      }

      const speed = npc.panicked ? 5.6 : 1.7;
      const dx = -Math.sin(npc.heading) * speed * dt;
      const dz = -Math.cos(npc.heading) * speed * dt;

      const res = this.resolveCircleCollisions(npc.x + dx, npc.z + dz, 0.45);
      npc.x = res.x;
      npc.z = res.z;

      if (res.hit || Math.abs(npc.x) > 135 || Math.abs(npc.z) > 135) {
        npc.heading += Math.PI * 0.85;
      }

      npc.walkCycle += dt * (npc.panicked ? 13 : 5.5);
      const swing = Math.sin(npc.walkCycle) * (npc.panicked ? 0.65 : 0.36);
      npc.leftLegPivot.rotation.x = swing;
      npc.rightLegPivot.rotation.x = -swing;
      npc.leftArmPivot.rotation.x = -swing * 0.7;
      npc.rightArmPivot.rotation.x = swing * 0.7;

      this.applyNpcEmotionAnimation(npc, now);

      npc.group.position.set(npc.x, 0, npc.z);
      npc.group.rotation.y = npc.heading;
    }
  }

  private updateAiVehiclesAndPolice(dt: number, now: number): void {
    let minPoliceDist = Infinity;

    if (this.wantedStars > 0) {
      this.sirenTimer += dt;
      if (this.sirenTimer >= 2.2) {
        this.sirenTimer = 0;
        this.audio.playPoliceSirenChirp();
      }
    }

    for (const v of this.vehicles) {
      if (v === this.activeVehicle) continue;

      const isPoliceChasing = this.wantedStars > 0 && v.spec.kind === 'police';
      if (isPoliceChasing) {
        v.aiDriven = true;
        const dx = this.playerX - v.x;
        const dz = this.playerZ - v.z;
        const dist = Math.hypot(dx, dz);
        minPoliceDist = Math.min(minPoliceDist, dist);

        const desiredYaw = Math.atan2(dx, dz);
        const angleDiff = Math.atan2(
          Math.sin(desiredYaw - v.rotationY),
          Math.cos(desiredYaw - v.rotationY)
        );
        v.rotationY += angleDiff * Math.min(1, dt * 3.2);

        const targetSpeed = dist > 7.5 ? 20 + this.wantedStars * 2.2 : 0;
        v.speed = THREE.MathUtils.damp(v.speed, targetSpeed, dist > 7.5 ? 3.5 : 8, dt);

        const fwdX = Math.sin(v.rotationY);
        const fwdZ = Math.cos(v.rotationY);
        const col = this.resolveCircleCollisions(v.x + fwdX * v.speed * dt, v.z + fwdZ * v.speed * dt, 1.65);
        if (col.hit) {
          v.rotationY += 0.9 * dt;
          v.speed *= 0.4;
        }
        v.x = col.x;
        v.z = col.z;

        const spinDelta = v.speed * dt * 2.4;
        for (const s of v.wheelSpinners) s.rotation.x += spinDelta;
        v.group.position.set(v.x, 0, v.z);
        v.group.rotation.y = v.rotationY;
        continue;
      }

      if (!v.aiDriven) continue;

      const fwdX = Math.sin(v.rotationY);
      const fwdZ = Math.cos(v.rotationY);
      let blocked = false;

      const pDx = this.playerX - v.x;
      const pDz = this.playerZ - v.z;
      const pDot = pDx * fwdX + pDz * fwdZ;
      if (pDot > 0 && pDot < 9.5 && Math.hypot(pDx, pDz) < 9.5) {
        blocked = true;
      }

      for (const other of this.vehicles) {
        if (other === v) continue;
        const oDx = other.x - v.x;
        const oDz = other.z - v.z;
        const oDot = oDx * fwdX + oDz * fwdZ;
        if (oDot > 0 && oDot < 10 && Math.hypot(oDx, oDz) < 10) {
          blocked = true;
          break;
        }
      }

      const targetSpeed = blocked ? 0 : v.spec.maxSpeed * 0.75;
      v.speed = THREE.MathUtils.damp(v.speed, targetSpeed, blocked ? 7 : 2.5, dt);
      v.taillightMat.emissiveIntensity = blocked ? 2.2 : 0.7;

      v.x += fwdX * v.speed * dt;
      v.z += fwdZ * v.speed * dt;

      if (v.aiLaneAxis === 'z') {
        if (v.z > 130) v.z = -130;
        if (v.z < -130) v.z = 130;
      } else {
        if (v.x > 130) v.x = -130;
        if (v.x < -130) v.x = 130;
      }

      const spinDelta = v.speed * dt * 2.4;
      for (const s of v.wheelSpinners) s.rotation.x += spinDelta;
      v.group.position.set(v.x, 0, v.z);
    }

    if (this.wantedStars > 0 && this.lifeState === 'alive') {
      const canBust =
        this.wantedStars <= 2 &&
        minPoliceDist < 4.6 &&
        now - this.lastFireTime > 3200 &&
        (!this.activeVehicle || Math.abs(this.activeVehicle.speed) < 3.5);

      if (canBust && !this.hostageNpc) {
        this.bustedTimer += dt;
        if (this.bustedTimer >= 2.3) {
          this.handleBustedStart();
        }
      } else {
        this.bustedTimer = Math.max(0, this.bustedTimer - dt * 1.4);
      }

      if (minPoliceDist < 11.5 && now > this.policeHoldFireUntil && !this.hostageNpc && this.wantedStars >= 2) {
        this.evadeTimer = 0;
        const dmg = dt * (4.2 + this.wantedStars * 1.6);
        if (this.armor > 0) {
          this.armor = Math.max(0, this.armor - dmg);
        } else {
          this.health = Math.max(0, this.health - dmg);
        }

        if (this.health <= 0) {
          this.handleWastedStart();
        }
      } else if (minPoliceDist > 68) {
        this.evadeTimer += dt;
        if (this.evadeTimer >= 12) {
          this.wantedStars = 0;
          this.evadeTimer = 0;
          this.bustedTimer = 0;
          this.triggerPoliceDispatch('সকল ইউনিট, সন্দেহভাজনকে খুঁজে পাওয়া যাচ্ছে না। কোড-৪ স্ট্যান্ড ডাউন।');
          this.showBanner('পুলিশের চোখ ফাঁকি দিয়ে পালিয়েছেন! (Wanted Cleared)', 4000);
        }
      } else {
        this.evadeTimer = Math.max(0, this.evadeTimer - dt * 0.5);
      }
    } else {
      this.bustedTimer = 0;
    }
  }

  private handleWastedStart(): void {
    if (this.lifeState !== 'alive') return;
    this.lifeState = 'wasted';
    this.lifeStateUntil = performance.now() + 2700;
    this.lifeMessage = 'ডা. ফারহান ও নার্স মিম ঢাকা মেডিকেলে জরুরি চিকিৎসা দিচ্ছেন (-৳500)';
    this.bustedTimer = 0;
    this.audio.updateEngine(false, 0);
    this.audio.playWastedTone();
  }

  private handleBustedStart(): void {
    if (this.lifeState !== 'alive') return;
    this.lifeState = 'busted';
    this.lifeStateUntil = performance.now() + 2700;
    this.lifeMessage = 'DMP গুলশান থানা পুলিশ আপনাকে গ্রেপ্তার করেছে — জামিন ফি -৳800';
    this.bustedTimer = 0;
    this.audio.updateEngine(false, 0);
    this.audio.playBustedTone();
  }

  private completeLifeReset(): void {
    const wasBusted = this.lifeState === 'busted';
    this.lifeState = 'alive';
    this.lifeMessage = null;
    this.activeVehicle = null;
    this.activeRobbery = null;
    this.robberyElapsed = 0;
    this.wantedStars = 0;
    this.evadeTimer = 0;
    this.bustedTimer = 0;
    this.health = 100;
    this.armor = wasBusted ? 25 : 50;
    this.cash = Math.max(0, this.cash - (wasBusted ? 800 : 500));

    if (wasBusted) {
      // Respawn outside DMP Gulshan Thana
      this.playerX = 41.5;
      this.playerZ = 34.0;
      this.playerHeading = Math.PI / 2;
      this.pushSocialPost(
        'DMP Press Wing',
        '@dmp_dhaka',
        `${this.mpPlayerName}-কে গুলশান এলাকা থেকে গ্রেপ্তার করে থানায় নেওয়া হয়েছে! 🚓`,
        '#Busted'
      );
      this.showBanner('BUSTED — DMP গুলশান থানা থেকে জামিনে মুক্তি (-৳800)', 5000);
    } else {
      // Respawn right in front of Dhaka Medical Hospital beside Dr. Farhan & Nurse Mim!
      this.playerX = 12.8;
      this.playerZ = 38.0;
      this.playerHeading = -Math.PI / 2;
      this.audio.speakBengali(
        'একটুর জন্য বেঁচে গেছেন ভাই! এখন বিশ্রাম নিন, আর ঝামেলায় জড়াবেন না।',
        false,
        'happy',
        'doctor'
      );
      this.showBanner('WASTED — ঢাকা মেডিকেলে ডাক্তার ও নার্স আপনাকে রিভাইভ করেছেন (-৳500)', 5500);
    }

    this.playerY = 0;
    this.playerVelY = 0;
    this.onFootCamYaw = this.playerHeading;
    this.player.group.visible = true;
    this.player.group.position.set(this.playerX, 0, this.playerZ);
    this.audio.updateEngine(false, 0);
    this.saveProgress();
  }

  private step = () => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
    const dt = this.lifeState !== 'alive' ? rawDt * 0.25 : rawDt;
    this.lastTime = now;

    if (this.lifeState !== 'alive' && now >= this.lifeStateUntil) {
      this.completeLifeReset();
    }

    this.gameMinutes = (this.gameMinutes + dt * 0.4) % (24 * 60);
    this.hunger = Math.max(10, this.hunger - dt * 0.025);
    this.thirst = Math.max(10, this.thirst - dt * 0.035);

    if (this.statusBanner && now > this.statusBannerUntil) {
      this.statusBanner = null;
    }
    if (this.policeDispatchBanner && now > this.policeDispatchUntil) {
      this.policeDispatchBanner = null;
    }
    if (this.ambientSpeech && now > this.ambientSpeechUntil) {
      this.ambientSpeech = null;
    }

    if (this.gpsTarget && Math.hypot(this.gpsTarget.x - this.playerX, this.gpsTarget.z - this.playerZ) < 6) {
      this.showBanner(`আপনি ${this.gpsTarget.name}-এ পৌঁছে গেছেন!`, 3000);
      this.gpsTarget = null;
    }

    if (this.reloadingUntil > 0 && now >= this.reloadingUntil && this.equippedWeapon !== 'fists') {
      const spec = WEAPON_CATALOG[this.equippedWeapon];
      const ammo = this.ammoState[this.equippedWeapon];
      const take = Math.min(spec.magSize - ammo.mag, ammo.reserve);
      ammo.mag += take;
      ammo.reserve -= take;
      this.reloadingUntil = 0;
    }

    if (this.lifeState === 'alive') {
      if (this.activeVehicle) {
        this.updateVehiclePhysics(dt);
      } else {
        this.updateCharacterPhysics(dt);
        this.tryFireWeapon(now);
      }
    }

    this.audio.updateRadio(!!this.activeVehicle && this.lifeState === 'alive', rawDt);

    this.updateRobberyAndHostage(dt, now);
    this.updateJobsAndTurfs(dt, now);
    this.updateHeistProgression(now);
    this.updateAiVehiclesAndPolice(dt, now);
    this.updateNpcs(dt, now);
    this.updateTracers(dt);
    this.updateRemotePlayers(dt);

    const moveWalkSpeed = this.activeVehicle
      ? Math.abs(this.activeVehicle.speed)
      : Math.hypot(this.input.moveX, this.input.moveY) * (this.input.sprint ? 8.6 : 4.7);
    this.mp?.sendMove({
      x: this.playerX,
      z: this.playerZ,
      heading: this.playerHeading,
      inVehicle: !!this.activeVehicle,
      vehicleKind: this.activeVehicle?.spec.kind,
      vehicleName: this.activeVehicle?.spec.name,
      wantedStars: this.wantedStars,
      passiveMode: this.passiveMode,
      walkSpeed: moveWalkSpeed,
      jobTitle: this.activeJob ? this.activeJob.title : 'Citizen',
    });

    const strobePhase = Math.floor(now / 180) % 2;
    for (const v of this.vehicles) {
      if (v.policeLightRed && v.policeLightBlue) {
        const active =
          v === this.activeVehicle ||
          (this.wantedStars > 0 && v.spec.kind === 'police') ||
          v.spec.kind === 'ambulance' ||
          this.timePreset === 'night';
        v.policeLightRed.emissiveIntensity = active ? (strobePhase === 0 ? 2.8 : 0.25) : 0.6;
        v.policeLightBlue.emissiveIntensity = active ? (strobePhase === 1 ? 2.8 : 0.25) : 0.6;
      }
    }

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);

    this.saveTimer += dt;
    if (this.saveTimer >= 6) {
      this.saveTimer = 0;
      this.saveProgress();
    }

    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.05) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }

    this.scheduleNextTick();
  };

  private updateCharacterPhysics(dt: number): void {
    const moveMag = Math.hypot(this.input.moveX, this.input.moveY);
    const isSprinting = this.input.sprint && moveMag > 0.1 && this.stamina > 4;

    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 16);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 11);
    }

    if (moveMag > 0.05) {
      const speed = isSprinting ? 8.6 : 4.7;
      const inputAngle = Math.atan2(-this.input.moveX, this.input.moveY);
      const worldMoveAngle = this.onFootCamYaw + inputAngle;

      const angleDiff = Math.atan2(
        Math.sin(worldMoveAngle - this.playerHeading),
        Math.cos(worldMoveAngle - this.playerHeading)
      );
      this.playerHeading += angleDiff * Math.min(1, dt * 10);

      const dx = -Math.sin(worldMoveAngle) * speed * dt * Math.min(1, moveMag);
      const dz = -Math.cos(worldMoveAngle) * speed * dt * Math.min(1, moveMag);

      const res = this.resolveCircleCollisions(this.playerX + dx, this.playerZ + dz, 0.55);
      this.playerX = res.x;
      this.playerZ = res.z;

      this.walkCycle += dt * (isSprinting ? 14 : 9);
      const swing = Math.sin(this.walkCycle) * (isSprinting ? 0.72 : 0.45);
      this.player.leftLegPivot.rotation.x = swing;
      this.player.rightLegPivot.rotation.x = -swing;
      this.player.leftArmPivot.rotation.x = -swing * 0.8;
      this.player.rightArmPivot.rotation.x =
        this.equippedWeapon !== 'fists' ? -1.45 : swing * 0.8;
      this.player.torso.position.y = 1.16 + Math.abs(Math.cos(this.walkCycle)) * 0.04;
    } else {
      this.player.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.player.leftLegPivot.rotation.x, 0, 12, dt);
      this.player.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.player.rightLegPivot.rotation.x, 0, 12, dt);
      this.player.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.player.leftArmPivot.rotation.x, 0, 12, dt);

      if (this.punchAnimTimer > 0) {
        this.punchAnimTimer -= dt;
        this.player.rightArmPivot.rotation.x = -1.6;
      } else {
        const targetArm = this.equippedWeapon !== 'fists' ? -1.45 : 0;
        this.player.rightArmPivot.rotation.x = THREE.MathUtils.damp(
          this.player.rightArmPivot.rotation.x,
          targetArm,
          12,
          dt
        );
      }
      this.player.torso.position.y = THREE.MathUtils.damp(this.player.torso.position.y, 1.16, 12, dt);
    }

    if (this.input.jump && !this.jumpLatch && this.playerY <= 0.001) {
      this.playerVelY = 6.2;
      this.jumpLatch = true;
    } else if (!this.input.jump) {
      this.jumpLatch = false;
    }

    if (this.playerY > 0 || this.playerVelY > 0) {
      this.playerVelY -= 18 * dt;
      this.playerY += this.playerVelY * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVelY = 0;
      }
    }

    this.player.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.player.group.rotation.y = this.playerHeading;
  }

  private updateVehiclePhysics(dt: number): void {
    const v = this.activeVehicle!;
    const throttle = v.fuel > 0 ? this.input.moveY : 0;
    const steerInput = -this.input.moveX;

    const effectiveMaxSpeed = v.spec.maxSpeed * (1 + v.upgrades.engineLevel * 0.12);
    const effectiveAccel =
      v.spec.accel * (1 + v.upgrades.engineLevel * 0.15 + (v.upgrades.turbo ? 0.22 : 0));
    const effectiveHandling = v.spec.handling + v.upgrades.brakesLevel * 0.12;
    const brakeMult = 1.9 + v.upgrades.brakesLevel * 0.35;

    if (throttle > 0.05) {
      if (v.upgrades.turbo && Math.abs(v.speed) > effectiveMaxSpeed * 0.45 && performance.now() - this.lastTurboTrigger > 2600) {
        this.lastTurboTrigger = performance.now();
        this.audio.playTurboBoost();
      }
      v.speed += throttle * effectiveAccel * dt;
      v.fuel = Math.max(0, v.fuel - dt * 0.25);
    } else if (throttle < -0.05) {
      if (v.speed > 0.5) {
        v.speed += throttle * effectiveAccel * brakeMult * dt;
      } else {
        v.speed += throttle * effectiveAccel * 0.6 * dt;
      }
    } else {
      v.speed = THREE.MathUtils.damp(v.speed, 0, 1.6, dt);
    }

    if (this.input.handbrake) {
      v.speed = THREE.MathUtils.damp(v.speed, 0, 5.5 + v.upgrades.brakesLevel * 0.8, dt);
    }

    v.speed = THREE.MathUtils.clamp(v.speed, -12, effectiveMaxSpeed);

    const isBraking = throttle < -0.1 || this.input.handbrake;
    v.taillightMat.emissiveIntensity = isBraking ? 2.4 : 0.7;

    const targetSteer = steerInput * 0.45;
    v.steerAngle = THREE.MathUtils.damp(v.steerAngle, targetSteer, 10, dt);
    v.wheelPivots.fl.rotation.y = v.steerAngle;
    v.wheelPivots.fr.rotation.y = v.steerAngle;

    if (Math.abs(v.speed) > 0.15) {
      const turnDir = v.speed >= 0 ? 1 : -1;
      const speedFactor = Math.min(1, Math.abs(v.speed) / 8);
      v.rotationY += steerInput * effectiveHandling * speedFactor * turnDir * dt;
    }

    const dx = Math.sin(v.rotationY) * v.speed * dt;
    const dz = Math.cos(v.rotationY) * v.speed * dt;

    const col = this.resolveCircleCollisions(v.x + dx, v.z + dz, 1.65);
    if (col.hit) {
      if (Math.abs(v.speed) > 10) {
        const dmgLoss = Math.max(0.5, 4 - v.upgrades.armorLevel * 0.7);
        v.health = Math.max(15, v.health - dmgLoss);
      }
      v.speed *= -0.3;
    }
    v.x = col.x;
    v.z = col.z;

    const spinDelta = v.speed * dt * 2.4;
    for (const spinner of v.wheelSpinners) {
      spinner.rotation.x += spinDelta;
    }

    v.group.position.set(v.x, 0, v.z);
    v.group.rotation.y = v.rotationY;

    this.playerX = v.x;
    this.playerZ = v.z;
    this.playerHeading = v.rotationY + Math.PI;

    this.audio.updateEngine(true, Math.abs(v.speed) / v.spec.maxSpeed, v.spec.kind === 'cng');
  }

  private updateCamera(dt: number): void {
    const now = performance.now();
    const inVeh = !!this.activeVehicle;
    const isAdsAiming = !inVeh && this.input.aiming && this.equippedWeapon !== 'fists' && this.lifeState === 'alive';
    const isSwitching = now < this.switchingUntil;
    const isWastedOrBusted = this.lifeState !== 'alive';

    const targetX = this.activeVehicle ? this.activeVehicle.x : this.playerX;
    const targetY = this.activeVehicle ? 1.35 : this.playerY + 1.45;
    const targetZ = this.activeVehicle ? this.activeVehicle.z : this.playerZ;

    const camYaw = inVeh
      ? this.activeVehicle!.rotationY + Math.PI + this.camYawOffset
      : this.onFootCamYaw;

    let dist = inVeh ? 8.2 : isAdsAiming ? 2.55 : 5.4;
    let pitch = this.camPitch;
    if (isSwitching) {
      const switchProg = Math.sin(((this.switchingUntil - now) / 950) * Math.PI);
      dist += switchProg * 28;
      pitch += switchProg * 0.75;
    } else if (isWastedOrBusted) {
      dist += 4.2;
      pitch = 0.72;
    }

    const heightOffset = Math.sin(pitch) * dist;
    const horizDist = Math.cos(pitch) * dist;
    const shoulderOffset = isAdsAiming ? 0.55 : 0;

    _camDesiredPos.set(
      targetX + Math.sin(camYaw) * horizDist + Math.cos(camYaw) * shoulderOffset,
      targetY + heightOffset,
      targetZ + Math.cos(camYaw) * horizDist - Math.sin(camYaw) * shoulderOffset
    );
    _camLookTarget.set(
      targetX + Math.cos(camYaw) * shoulderOffset * 0.85,
      targetY + (isAdsAiming ? 0.12 : 0.35),
      targetZ - Math.sin(camYaw) * shoulderOffset * 0.85
    );

    const targetFov = inVeh
      ? 62 + (Math.abs(this.activeVehicle!.speed) / this.activeVehicle!.spec.maxSpeed) * 11
      : isAdsAiming
      ? 45
      : 60;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
    this.camera.updateProjectionMatrix();

    const dampLambda = isSwitching ? 6 : isAdsAiming ? 15 : inVeh ? 8.5 : 10;
    this.currentCamPos.x = THREE.MathUtils.damp(this.currentCamPos.x, _camDesiredPos.x, dampLambda, dt);
    this.currentCamPos.y = THREE.MathUtils.damp(this.currentCamPos.y, _camDesiredPos.y, dampLambda, dt);
    this.currentCamPos.z = THREE.MathUtils.damp(this.currentCamPos.z, _camDesiredPos.z, dampLambda, dt);

    this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, _camLookTarget.x, 14, dt);
    this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, _camLookTarget.y, 14, dt);
    this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, _camLookTarget.z, 14, dt);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);
  }

  private getStreetZone(): { streetName: string; postalCode: string } {
    for (const z of this.world.streetZones) {
      if (
        this.playerX >= z.minX &&
        this.playerX <= z.maxX &&
        this.playerZ >= z.minZ &&
        this.playerZ <= z.maxZ
      ) {
        return { streetName: z.name, postalCode: z.postal };
      }
    }
    return { streetName: 'Dhaka City', postalCode: '1200' };
  }

  private emitHud(): void {
    const now = performance.now();
    const { streetName, postalCode } = this.getStreetZone();
    const nearVeh = this.activeVehicle ? null : this.findNearestVehicle(4.6);
    const nearCivilian = this.activeVehicle || this.hostageNpc ? null : this.findNearestCivilian(3.8);
    const nearService = this.activeVehicle ? null : this.findNearestServiceNpc(4.2);
    const nearRobbery = this.activeVehicle || this.activeRobbery ? null : this.findNearestRobberySpot(4.2);
    const nearCustomsBay =
      Math.hypot(DHAKA_CUSTOMS_POS.x - this.playerX, DHAKA_CUSTOMS_POS.z - this.playerZ) < 6.8;
    const nearProperty =
      this.properties.find((p) => Math.hypot(p.x - this.playerX, p.z - this.playerZ) < 5.2) ?? null;

    const hrs = Math.floor(this.gameMinutes / 60) % 24;
    const mins = Math.floor(this.gameMinutes % 60);
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const h12 = hrs % 12 === 0 ? 12 : hrs % 12;
    const gameTimeStr = `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
    const wSpec = WEAPON_CATALOG[this.equippedWeapon];
    const ammo = this.ammoState[this.equippedWeapon];

    let nearbyPrompt: string | null = null;
    if (nearCustomsBay && this.activeVehicle) {
      nearbyPrompt = `Press U or tap Tune: Dhaka Customs (${this.activeVehicle.spec.name})`;
    } else if (nearService) {
      const actionLabel =
        nearService.role === 'doctor' || nearService.role === 'nurse'
          ? 'Get Treatment (৳300)'
          : nearService.role === 'shopkeeper'
          ? 'Buy Tea & Snacks (৳30)'
          : 'Buy Ammo & Armor (৳800)';
      nearbyPrompt = `Press B or tap Interact: ${nearService.name} — ${actionLabel}`;
    } else if (nearRobbery) {
      nearbyPrompt = `Press V or tap Rob: ${nearRobbery.name}`;
    } else if (nearProperty) {
      nearbyPrompt = nearProperty.owned
        ? `Press K (Heist) or P (Manage): ${nearProperty.name}`
        : `Press P (Dynasty 8): Buy ${nearProperty.name} (৳${nearProperty.price.toLocaleString()})`;
    } else if (nearVeh) {
      nearbyPrompt = `Press F or tap Drive: ${nearVeh.spec.name}`;
    } else if (nearCivilian) {
      nearbyPrompt = `Press G or tap Hostage: ${nearCivilian.name}`;
    }

    this.onHudUpdate({
      health: Math.round(this.health),
      armor: Math.round(this.armor),
      hunger: Math.round(this.hunger),
      thirst: Math.round(this.thirst),
      stamina: Math.round(this.stamina),
      voiceActive: false,
      cash: this.cash,
      bank: this.bank,
      speedKmh: this.activeVehicle ? Math.round(Math.abs(this.activeVehicle.speed) * 3.6) : 0,
      inVehicle: !!this.activeVehicle,
      vehicleName: this.activeVehicle ? this.activeVehicle.spec.name : '',
      vehicleId: this.activeVehicle ? this.activeVehicle.spec.id : null,
      vehicleHealth: this.activeVehicle ? Math.round(this.activeVehicle.health) : 100,
      vehicleFuel: this.activeVehicle ? Math.round(this.activeVehicle.fuel) : 100,
      vehicleUpgrades: this.activeVehicle
        ? { ...this.activeVehicle.upgrades }
        : this.vehicles[0]
        ? { ...this.vehicles[0].upgrades }
        : null,
      nearCustomsBay,
      headlightsOn: this.headlightsOn,
      nearVehicleName: nearVeh ? nearVeh.spec.name : null,
      streetName,
      postalCode,
      gameTimeStr,
      timePreset: this.timePreset,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerHeading: this.playerHeading,
      wantedStars: this.wantedStars,
      evadingPolice: this.evadeTimer > 1.5,
      nearbyPrompt,
      canTakeHostage: !!nearCivilian,
      hasHostage: !!this.hostageNpc,
      hostageName: this.hostageNpc ? this.hostageNpc.name : null,
      hostageDialogue: this.hostageDialogue,
      nearRobberyName: nearRobbery ? nearRobbery.name : null,
      activeRobberyName: this.activeRobbery ? this.activeRobbery.name : null,
      robberyProgress: this.activeRobbery
        ? Math.min(100, Math.round((this.robberyElapsed / this.activeRobbery.durationSec) * 100))
        : 0,
      nearServiceNpc: nearService ? { name: nearService.name, role: nearService.role } : null,
      nearProperty: nearProperty ? { ...nearProperty } : null,
      properties: this.properties.map((p) => ({ ...p })),
      spawnPropertyId: this.spawnPropertyId,
      equippedOutfit: this.equippedOutfit,
      heist: { ...this.heist },
      gpsTarget: this.gpsTarget,
      inventory: this.inventory.map((i) => ({ ...i })),
      activeJob: this.activeJob ? { ...this.activeJob } : null,
      activeTurf: this.activeTurf ? { ...this.activeTurf } : null,
      turfZones: this.turfZones.map((t) => ({ ...t })),
      completedJobs: this.completedJobs,
      gangRep: this.gangRep,
      statusBanner: this.statusBanner,
      equippedWeapon: this.equippedWeapon,
      weaponName: wSpec.name,
      ammoInMag: ammo.mag,
      ammoReserve: ammo.reserve,
      reloading: this.reloadingUntil > now,
      aiming: !this.activeVehicle && this.input.aiming && this.equippedWeapon !== 'fists',
      hitMarker: now < this.hitMarkerUntil,
      radioStation: this.radioStation,
      protagonist: this.protagonist,
      switchingCharacter: now < this.switchingUntil,
      lifeState: this.lifeState,
      lifeMessage: this.lifeMessage,
      bustedProgress: Math.min(100, Math.round((this.bustedTimer / 2.3) * 100)),
      policeDispatchBanner: this.policeDispatchBanner,
      ambientSpeech: this.ambientSpeech,
      socialFeed: this.socialFeed,
      vehicles: this.vehicles.map((v) => ({
        x: v.x,
        z: v.z,
        kind: v.spec.kind,
        chasing: this.wantedStars > 0 && v.spec.kind === 'police' && v !== this.activeVehicle,
        heading: v.rotationY,
      })),
      npcs: this.npcs
        .filter((n) => n.alive)
        .map((n) => ({
          x: n.x,
          z: n.z,
          role: n.role,
          panicked: n.panicked,
          isHostage: n.isHostage,
        })),
      robberySpots: this.world.robberySpots.map((s) => ({
        id: s.id,
        name: s.name,
        x: s.x,
        z: s.z,
        ready: s.cooldownUntil <= now,
      })),
      mpConnected: this.mpConnected,
      mpPlayerId: this.mpPlayerId,
      mpPlayerName: this.mpPlayerName,
      mpGangTag: this.mpGangTag,
      mpPingMs: this.mpPingMs,
      passiveMode: this.passiveMode,
      remotePlayers: this.remotePlayers,
      mpChatFeed: this.mpChatFeed,
    });
  }

  private syncRemotePlayerRigs(players: RemotePlayerState[]): void {
    const activeIds = new Set<number>();
    for (const p of players) {
      activeIds.add(p.id);
      let rig = this.remoteRigs.get(p.id);
      if (!rig) {
        rig = createRemotePlayerAvatar(
          this.shadowTex,
          p.id,
          p.name,
          p.gangTag,
          p.x,
          p.z,
          p.heading
        );
        this.scene.add(rig.group);
        this.remoteRigs.set(p.id, rig);
      }
      rig.targetX = p.x;
      rig.targetZ = p.z;
      rig.targetHeading = p.heading;
      rig.inVehicle = p.inVehicle;
      rig.passiveMode = p.passiveMode;
      rig.humanRig.group.visible = !p.inVehicle;
      rig.vehicleGroup.visible = p.inVehicle;
      rig.labelSprite.position.y = p.inVehicle ? 2.5 : 2.35;
      updateRemoteAvatarLabel(rig, p.name, p.gangTag, p.wantedStars, p.passiveMode);
    }

    for (const [rid, rig] of this.remoteRigs.entries()) {
      if (!activeIds.has(rid)) {
        this.scene.remove(rig.group);
        const mat = rig.labelSprite.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
        this.remoteRigs.delete(rid);
      }
    }
  }

  private updateRemotePlayers(dt: number): void {
    for (const rig of this.remoteRigs.values()) {
      const prevX = rig.x;
      const prevZ = rig.z;
      rig.x = THREE.MathUtils.damp(rig.x, rig.targetX, 10, dt);
      rig.z = THREE.MathUtils.damp(rig.z, rig.targetZ, 10, dt);

      const angleDiff = Math.atan2(
        Math.sin(rig.targetHeading - rig.heading),
        Math.cos(rig.targetHeading - rig.heading)
      );
      rig.heading += angleDiff * Math.min(1, dt * 10);

      rig.group.position.set(rig.x, 0, rig.z);
      rig.group.rotation.y = rig.inVehicle ? rig.heading + Math.PI : rig.heading;

      if (!rig.inVehicle) {
        const moved = Math.hypot(rig.x - prevX, rig.z - prevZ) / Math.max(dt, 0.001);
        if (moved > 0.35) {
          rig.walkCycle += dt * Math.min(14, moved * 2.1);
          const swing = Math.sin(rig.walkCycle) * 0.45;
          rig.humanRig.leftLegPivot.rotation.x = swing;
          rig.humanRig.rightLegPivot.rotation.x = -swing;
          rig.humanRig.leftArmPivot.rotation.x = -swing * 0.7;
          rig.humanRig.rightArmPivot.rotation.x = swing * 0.7;
        } else {
          rig.humanRig.leftLegPivot.rotation.x = THREE.MathUtils.damp(rig.humanRig.leftLegPivot.rotation.x, 0, 10, dt);
          rig.humanRig.rightLegPivot.rotation.x = THREE.MathUtils.damp(rig.humanRig.rightLegPivot.rotation.x, 0, 10, dt);
          rig.humanRig.leftArmPivot.rotation.x = THREE.MathUtils.damp(rig.humanRig.leftArmPivot.rotation.x, 0, 10, dt);
          rig.humanRig.rightArmPivot.rotation.x = THREE.MathUtils.damp(rig.humanRig.rightArmPivot.rotation.x, 0, 10, dt);
        }
      }
    }
  }

  private updateJobsAndTurfs(dt: number, now: number): void {
    // 1. Update Active Roleplay Job
    if (this.activeJob) {
      const job = this.activeJob;
      this.jobBeaconGroup.visible = true;
      this.jobBeaconGroup.position.set(job.targetX, 0, job.targetZ);
      this.jobBeaconGroup.rotation.y = now * 0.002;

      const dist = Math.hypot(job.targetX - this.playerX, job.targetZ - this.playerZ);
      if (dist < 5.8) {
        if (job.stage === 'pickup') {
          if (job.kind === 'paramedic') {
            job.stage = 'stabilize';
            job.progress = 0;
            this.showBanner('রোগীর পালস চেক ও প্রাথমিক চিকিৎসা চলছে... স্থির থাকুন!', 3000);
          } else if (this.jobDropTarget) {
            job.stage = 'dropoff';
            job.targetName = this.jobDropTarget.name;
            job.targetX = this.jobDropTarget.x;
            job.targetZ = this.jobDropTarget.z;
            this.audio.playDoorClick();
            const msg =
              job.kind === 'cng_ride'
                ? `যাত্রী উঠেছে! এবার ${job.targetName}-এ ড্রপ করুন।`
                : job.kind === 'delivery'
                ? `পার্সেল নেওয়া হয়েছে! ${job.targetName}-এ ডেলিভারি দিন।`
                : `চেকপয়েন্ট ক্লিয়ার! রিপোর্ট দিতে ${job.targetName}-এ ফিরুন।`;
            this.showBanner(msg, 3800);
          }
        } else if (job.stage === 'stabilize') {
          job.progress = Math.min(100, job.progress + dt * 42);
          if (job.progress >= 100 && this.jobDropTarget) {
            job.stage = 'dropoff';
            job.progress = 0;
            job.targetName = this.jobDropTarget.name;
            job.targetX = this.jobDropTarget.x;
            job.targetZ = this.jobDropTarget.z;
            this.audio.playDoorClick();
            this.showBanner('রোগী স্ট্যাবল! এবার ঢাকা মেডিকেলে দ্রুত নিয়ে আসুন!', 4000);
          }
        } else if (job.stage === 'dropoff') {
          this.cash += job.reward;
          this.completedJobs += 1;
          this.gangRep += 20;
          if (job.kind === 'police_patrol' && this.wantedStars > 0) {
            this.wantedStars = Math.max(0, this.wantedStars - 1);
          }
          this.audio.playCashReward();
          this.showBanner(
            `${job.title} সম্পন্ন! +৳${job.reward.toLocaleString()} ও +20 RP অর্জিত হয়েছে`,
            4600
          );
          this.activeJob = null;
          this.jobDropTarget = null;
          this.jobBeaconGroup.visible = false;
          this.saveProgress();
        }
      }
    } else {
      this.jobBeaconGroup.visible = false;
    }

    // 2. Update Dhaka TG Gang Turf Capture
    let insideTurf: TurfZone | null = null;
    for (const turf of this.turfZones) {
      const dist = Math.hypot(turf.x - this.playerX, turf.z - this.playerZ);
      if (dist <= turf.radius) {
        insideTurf = turf;
        break;
      }
    }

    if (insideTurf) {
      if (insideTurf.owner === 'RIVAL' && !this.activeVehicle) {
        this.turfCaptureElapsed = Math.min(6, this.turfCaptureElapsed + dt);
        const pct = Math.round((this.turfCaptureElapsed / 6) * 100);
        this.activeTurf = { name: insideTurf.name, owner: 'RIVAL', progress: pct };

        if (this.turfCaptureElapsed >= 6) {
          insideTurf.owner = 'TG';
          this.cash += insideTurf.reward;
          this.gangRep += 50;
          this.wantedStars = Math.max(this.wantedStars, 1);
          this.turfCaptureElapsed = 0;
          const meshEntry = this.turfMeshes.find((m) => m.id === insideTurf!.id);
          if (meshEntry) meshEntry.mat.color.setHex(0x10b981);
          this.audio.playCashReward();
          this.mp?.sendTurfCaptured(insideTurf.id, insideTurf.name, 'TG');
          this.showBanner(
            `${insideTurf.name} এখন TG গ্যাং-এর দখলে! +৳${insideTurf.reward.toLocaleString()}`,
            5000
          );
          this.saveProgress();
        }
      } else {
        this.turfCaptureElapsed = Math.max(0, this.turfCaptureElapsed - dt * 0.5);
        this.activeTurf = {
          name: insideTurf.name,
          owner: insideTurf.owner,
          progress: insideTurf.owner === 'TG' ? 100 : Math.round((this.turfCaptureElapsed / 6) * 100),
        };
      }
    } else {
      this.turfCaptureElapsed = 0;
      this.activeTurf = null;
    }
  }

  private updateHeistProgression(now: number): void {
    const st = this.heist.stage;
    if (st === 'idle' || st === 'ready_finale' || st === 'finale_hack' || st === 'finale_drill') {
      this.heistBeaconGroup.visible = false;
      return;
    }

    this.heistBeaconGroup.visible = true;
    this.heistBeaconGroup.position.set(this.heist.targetX, 0, this.heist.targetZ);
    this.heistBeaconGroup.rotation.y = now * 0.0025;

    const dist = Math.hypot(this.heist.targetX - this.playerX, this.heist.targetZ - this.playerZ);
    const safehouse = this.properties.find((p) => p.owned && p.hasHeistRoom) ?? this.properties[1];

    if (st === 'setup_hack_van') {
      if (this.heistPickupPhase === 'outbound' && dist < 6.0) {
        this.heistPickupPhase = 'return';
        this.heist.targetName = `${safehouse.name} (Return Van)`;
        this.heist.targetX = safehouse.x;
        this.heist.targetZ = safehouse.z;
        this.audio.playDoorClick();
        this.showBanner('হ্যাকিং ভ্যান পাওয়া গেছে! এবার অ্যাপার্টমেন্ট গ্যারেজে ফিরে যান!', 4000);
      } else if (this.heistPickupPhase === 'return' && dist < 6.0) {
        this.heist.setup1Done = true;
        this.heist.stage = this.heist.setup2Done ? 'ready_finale' : 'idle';
        this.cash += 8000;
        this.gangRep += 35;
        this.audio.playCashReward();
        this.showBanner('Setup 1 (Hack Device) সম্পন্ন! +৳8,000 বোনাস', 4200);
        this.saveProgress();
      }
    } else if (st === 'setup_kuruma') {
      if (this.heistPickupPhase === 'outbound' && dist < 6.0) {
        this.heistPickupPhase = 'return';
        this.heist.targetName = `${safehouse.name} (Stash Kuruma)`;
        this.heist.targetX = safehouse.x;
        this.heist.targetZ = safehouse.z;
        this.audio.playDoorClick();
        this.showBanner('Armored Kuruma উদ্ধার হয়েছে! এবার সেফহাউসে পার্ক করুন!', 4000);
      } else if (this.heistPickupPhase === 'return' && dist < 6.0) {
        this.heist.setup2Done = true;
        this.heist.stage = this.heist.setup1Done ? 'ready_finale' : 'idle';
        this.cash += 10000;
        this.gangRep += 40;
        // Apply free Armored Kuruma armor upgrade on player Prado if unarmored
        const prado = this.vehicles[0];
        if (prado && prado.upgrades.armorLevel < 3) {
          applyVehicleUpgradesToRig(prado, { ...prado.upgrades, armorLevel: 3 });
          this.savedVehicleUpgrades[prado.spec.id] = prado.upgrades;
        }
        this.audio.playCashReward();
        this.showBanner('Setup 2 (Armored Kuruma) সম্পন্ন! +৳10,000 ও আর্মার আনলক!', 4500);
        this.saveProgress();
      }
    } else if (st === 'finale_approach' && dist < 5.5) {
      if (this.activeVehicle) {
        this.toggleVehicle();
      }
      this.heist.stage = 'finale_hack';
      this.wantedStars = Math.max(this.wantedStars, 2);
      this.audio.playAlarmBeep();
      this.showBanner('ঢাকা ব্যাংক ভল্ট গেটে পৌঁছেছেন! সিকিউরিটি সার্কিট হ্যাক করুন!', 4500);
    } else if (st === 'finale_escape' && dist < 7.5) {
      const payout = this.heist.potentialPayout;
      this.bank += payout;
      this.gangRep += 150;
      this.heist.completedHeists += 1;
      this.heist.setup1Done = false;
      this.heist.setup2Done = false;
      this.heist.stage = 'idle';
      this.wantedStars = 0;
      this.evadeTimer = 0;
      this.heistBeaconGroup.visible = false;
      this.audio.playCashReward();
      this.showBanner(
        `THE DHAKA BANK JOB SUCCESS! +৳${payout.toLocaleString()} ব্যাংকে জমা হয়েছে! (+150 RP)`,
        6000
      );
      this.saveProgress();
    }
  }

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.step);
    } else {
      this.frameId = requestAnimationFrame(this.step);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose(): void {
    this.disposed = true;
    this.saveProgress();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.audio.dispose();
    this.mp?.dispose();
    for (const rig of this.remoteRigs.values()) {
      const mat = rig.labelSprite.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.remoteRigs.clear();
    this.world.dispose();
    this.shadowTex.dispose();
    this.tracerGeo.dispose();
    this.tracerMat.dispose();
    this.jobBeaconMat.dispose();
    this.heistBeaconMat.dispose();
    this.jobBeaconGeos.forEach((g) => g.dispose());
    this.turfMeshes.forEach((m) => {
      m.geo.dispose();
      m.mat.dispose();
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
