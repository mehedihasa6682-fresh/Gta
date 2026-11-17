export type TimePreset = 'day' | 'sunset' | 'night';

export type WeaponId = 'fists' | 'pistol' | 'smg' | 'shotgun';

export type NpcRole = 'civilian' | 'doctor' | 'nurse' | 'shopkeeper' | 'dealer';

export type InventoryItemId = 'tea' | 'water' | 'bandage' | 'armor' | 'ammo_pack';

export interface InventoryItem {
  id: InventoryItemId;
  name: string;
  count: number;
  price: number;
  description: string;
}

export interface GpsTarget {
  id: string;
  name: string;
  x: number;
  z: number;
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  damage: number;
  fireRateMs: number;
  magSize: number;
  spread: number;
  pellets: number;
  range: number;
}

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

export interface StreetZone {
  name: string;
  postal: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RobberySpot {
  id: string;
  name: string;
  x: number;
  z: number;
  rewardMin: number;
  rewardMax: number;
  durationSec: number;
  wantedStars: number;
  cooldownUntil: number;
}

export interface MinimapBuilding {
  x: number;
  z: number;
  w: number;
  d: number;
  color: string;
  label?: string;
}

export interface MinimapRoad {
  x: number;
  z: number;
  w: number;
  d: number;
  isDivider?: boolean;
}

export interface GangMember {
  id: string;
  name: string;
  tag: string;
  role: 'BOSS' | 'MEMBER' | 'ROOKIE';
}

export type VehicleKind = 'suv' | 'coupe' | 'police' | 'cng' | 'sedan' | 'ambulance';

export interface VehicleSpec {
  id: string;
  name: string;
  kind: VehicleKind;
  color: number;
  x: number;
  z: number;
  rotationY: number;
  maxSpeed: number;
  accel: number;
  handling: number;
  aiDriven?: boolean;
  aiLaneAxis?: 'x' | 'z';
  aiLaneCoord?: number;
  aiDir?: 1 | -1;
}

export interface VehicleHudMarker {
  x: number;
  z: number;
  kind: VehicleKind;
  chasing?: boolean;
  heading?: number;
}

export interface NpcHudMarker {
  x: number;
  z: number;
  role: NpcRole;
  panicked: boolean;
  isHostage?: boolean;
}

export interface RobberyHudMarker {
  id: string;
  name: string;
  x: number;
  z: number;
  ready: boolean;
}

export type JobKind = 'cng_ride' | 'paramedic' | 'delivery' | 'police_patrol';

export interface ActiveJobState {
  kind: JobKind;
  title: string;
  stage: 'pickup' | 'stabilize' | 'dropoff';
  targetName: string;
  targetX: number;
  targetZ: number;
  reward: number;
  progress: number;
}

export interface TurfZone {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  owner: 'TG' | 'RIVAL';
  reward: number;
}

export type MpChatChannel = 'global' | 'local' | 'me' | 'do' | 'dispatch';

export interface MpChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  gangTag: string;
  channel: MpChatChannel;
  text: string;
  timestamp: number;
}

export interface RemotePlayerState {
  id: number;
  name: string;
  gangTag: string;
  jobTitle: string;
  x: number;
  z: number;
  heading: number;
  inVehicle: boolean;
  vehicleKind?: VehicleKind;
  vehicleName?: string;
  wantedStars: number;
  passiveMode: boolean;
  walkSpeed: number;
  pingMs: number;
}

export type NeonColorId = 'none' | 'cyan' | 'crimson' | 'emerald' | 'gold' | 'purple';

export type PaintFinish = 'metallic' | 'matte' | 'chrome';

export interface VehicleUpgradeState {
  paintHex: number;
  paintName: string;
  finish: PaintFinish;
  engineLevel: number; // 0 to 4 (EMS)
  turbo: boolean;
  armorLevel: number; // 0 to 5 (0% to 100%)
  brakesLevel: number; // 0 to 3 (Stock -> Race)
  neon: NeonColorId;
  plateText: string;
}

export type PlayerOutfitId = 'tg_boss' | 'dmp_tac' | 'dhaka_panjabi' | 'racer_red';

export interface PropertySpec {
  id: string;
  name: string;
  district: string;
  price: number;
  garageSlots: number;
  hasHeistRoom: boolean;
  x: number;
  z: number;
  owned: boolean;
}

export type HeistStage =
  | 'idle'
  | 'setup_hack_van'
  | 'setup_kuruma'
  | 'ready_finale'
  | 'finale_approach'
  | 'finale_hack'
  | 'finale_drill'
  | 'finale_escape';

export interface HeistState {
  stage: HeistStage;
  setup1Done: boolean;
  setup2Done: boolean;
  targetName: string;
  targetX: number;
  targetZ: number;
  potentialPayout: number;
  completedHeists: number;
}

export type RadioStationId = 'off' | 'dhaka_bass' | 'bangla_rock' | 'vice_wave' | 'talk_dhaka';

export type ProtagonistId = 'sadik' | 'nadia';

export type PlayerLifeState = 'alive' | 'wasted' | 'busted';

export interface SocialPost {
  id: string;
  handle: string;
  author: string;
  caption: string;
  tag: string;
  likes: number;
  timeAgo: string;
  highlight?: boolean;
}

export interface AmbientSpeechBubble {
  speaker: string;
  text: string;
  isFemale: boolean;
  tone: 'panic' | 'angry' | 'dispatch' | 'casual';
}

export interface HUDState {
  health: number;
  armor: number;
  hunger: number;
  thirst: number;
  stamina: number;
  voiceActive: boolean;
  cash: number;
  bank: number;
  speedKmh: number;
  inVehicle: boolean;
  vehicleName: string;
  vehicleId: string | null;
  vehicleHealth: number;
  vehicleFuel: number;
  vehicleUpgrades: VehicleUpgradeState | null;
  nearCustomsBay: boolean;
  headlightsOn: boolean;
  nearVehicleName: string | null;
  streetName: string;
  postalCode: string;
  gameTimeStr: string;
  timePreset: TimePreset;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  wantedStars: number;
  evadingPolice: boolean;
  nearbyPrompt: string | null;
  canTakeHostage: boolean;
  hasHostage: boolean;
  hostageName: string | null;
  hostageDialogue: string | null;
  nearRobberyName: string | null;
  activeRobberyName: string | null;
  robberyProgress: number;
  nearServiceNpc: { name: string; role: NpcRole } | null;
  nearProperty: PropertySpec | null;
  properties: PropertySpec[];
  spawnPropertyId: string | null;
  equippedOutfit: PlayerOutfitId;
  heist: HeistState;
  gpsTarget: GpsTarget | null;
  inventory: InventoryItem[];
  activeJob: ActiveJobState | null;
  activeTurf: { name: string; owner: 'TG' | 'RIVAL'; progress: number } | null;
  turfZones: TurfZone[];
  completedJobs: number;
  gangRep: number;
  statusBanner: string | null;
  equippedWeapon: WeaponId;
  weaponName: string;
  ammoInMag: number;
  ammoReserve: number;
  reloading: boolean;
  aiming: boolean;
  hitMarker: boolean;
  radioStation: RadioStationId;
  protagonist: ProtagonistId;
  switchingCharacter: boolean;
  lifeState: PlayerLifeState;
  lifeMessage: string | null;
  bustedProgress: number;
  policeDispatchBanner: string | null;
  ambientSpeech: AmbientSpeechBubble | null;
  socialFeed: SocialPost[];
  vehicles: VehicleHudMarker[];
  npcs: NpcHudMarker[];
  robberySpots: RobberyHudMarker[];
  mpConnected: boolean;
  mpPlayerId: number | null;
  mpPlayerName: string;
  mpGangTag: string;
  mpPingMs: number;
  passiveMode: boolean;
  remotePlayers: RemotePlayerState[];
  mpChatFeed: MpChatMessage[];
}

export interface ControlInput {
  moveX: number;
  moveY: number;
  sprint: boolean;
  jump: boolean;
  handbrake: boolean;
  firing: boolean;
  aiming: boolean;
}
