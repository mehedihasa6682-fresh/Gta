import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  Banknote,
  Briefcase,
  Building2,
  CarFront,
  ChevronDown,
  ChevronUp,
  Cpu,
  Crosshair,
  Disc3,
  Droplets,
  Flag,
  Flame,
  Gamepad2,
  Hand,
  Heart,
  Home,
  KeyRound,
  Laugh,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquareQuote,
  Mic,
  Moon,
  Navigation,
  Package,
  Palette,
  Radio,
  RotateCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldOff,
  Shirt,
  SlidersHorizontal,
  Smartphone,
  Star,
  Stethoscope,
  Sun,
  Sunset,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  ChatEmotion,
  ChatRole,
  ROLE_CHAT_BANK,
  ROLE_META,
  RoleChatReply,
} from '../game/roleChats';
import {
  GangMember,
  GpsTarget,
  HUDState,
  InventoryItemId,
  JobKind,
  MinimapBuilding,
  MinimapRoad,
  MpChatChannel,
  NeonColorId,
  PaintFinish,
  PlayerOutfitId,
  ProtagonistId,
  RadioStationId,
  TimePreset,
  VehicleUpgradeState,
  WeaponId,
} from '../game/types';
import { DHAKA_CUSTOMS_POS } from '../game/world';
import { PWAInstallButton } from './PWAInstallButton';

interface FiveMHudProps {
  hud: HUDState;
  buildings: MinimapBuilding[];
  roads: MinimapRoad[];
  crew: GangMember[];
  gpsLocations: GpsTarget[];
  hudHidden: boolean;
  muted: boolean;
  touchEnabled: boolean;
  weaponWheelOpen: boolean;
  phoneOpen: boolean;
  inventoryOpen: boolean;
  chatOpen: boolean;
  scoreboardOpen: boolean;
  customsOpen: boolean;
  heistOpen: boolean;
  onToggleHud: () => void;
  onToggleVehicle: () => void;
  onToggleHostage: () => void;
  onCycleHostageDialogue: () => void;
  onStartRobbery: () => void;
  onInteractService: () => void;
  onToggleHeadlights: () => void;
  onHonk: () => void;
  onSelectTime: (preset: TimePreset) => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
  onToggleWeaponWheel: () => void;
  onTogglePhone: () => void;
  onToggleInventory: () => void;
  onToggleChat: () => void;
  onToggleScoreboard: () => void;
  onToggleCustoms: () => void;
  onToggleHeist: () => void;
  onSendServerChat: (channel: MpChatChannel, text: string) => void;
  onUpdateProfile: (name: string, gangTag: string) => void;
  onTogglePassive: () => void;
  onAskRoleChat: (
    role: ChatRole,
    question: string,
    voiceFemaleOverride?: boolean
  ) => RoleChatReply | undefined;
  onPlayEmotion: (emotion: 'laugh' | 'cry', isFemale: boolean) => void;
  onReplayVoice: (text: string, isFemale: boolean, emotion: ChatEmotion, role?: ChatRole) => void;
  onSelectWeapon: (weapon: WeaponId) => void;
  onReload: () => void;
  onDepositCash: (amount: number) => void;
  onWithdrawCash: (amount: number) => void;
  onSelectGps: (target: GpsTarget | null) => void;
  onCallMechanic: () => void;
  onUseItem: (id: InventoryItemId) => void;
  onBuyItem: (id: InventoryItemId) => void;
  onStartJob: (kind: JobKind) => void;
  onCancelJob: () => void;
  onApplyVehicleUpgrade: (partial: Partial<VehicleUpgradeState>, cost: number, repair?: boolean) => boolean;
  onBuyProperty: (id: string) => void;
  onSetSpawnProperty: (id: string | null) => void;
  onRestApartment: (id: string) => void;
  onEquipOutfit: (outfit: PlayerOutfitId) => void;
  onSummonGarageVehicle: (vehicleId: string) => void;
  onStartHeistSetup: (step: 1 | 2) => void;
  onStartBankHeistFinale: () => void;
  onAdvanceHeistMinigame: (nextStage: 'finale_drill' | 'finale_escape') => void;
  onPlayHeistDrillTick: (heatRatio: number) => void;
  onCancelHeistMission: () => void;
  onCycleRadio: () => void;
  onSwitchProtagonist: (id?: ProtagonistId) => void;
}

const CUSTOMS_PAINTS: { name: string; hex: number; css: string }[] = [
  { name: 'Midnight Obsidian', hex: 0x111827, css: '#111827' },
  { name: 'Dhaka Emerald', hex: 0x059669, css: '#059669' },
  { name: 'Crimson GT', hex: 0x991b1b, css: '#991b1b' },
  { name: 'Royal Cobalt', hex: 0x1d4ed8, css: '#1d4ed8' },
  { name: 'Pearl White', hex: 0xe2e8f0, css: '#e2e8f0' },
  { name: 'Solar Gold', hex: 0xd97706, css: '#d97706' },
  { name: 'Gulshan Violet', hex: 0x6d28d9, css: '#6d28d9' },
];

const NEON_KITS: { id: NeonColorId; label: string; css: string }[] = [
  { id: 'none', label: 'Off', css: '#334155' },
  { id: 'cyan', label: 'Cyan', css: '#22d3ee' },
  { id: 'crimson', label: 'Red', css: '#ef4444' },
  { id: 'emerald', label: 'Green', css: '#10b981' },
  { id: 'gold', label: 'Gold', css: '#fbbf24' },
  { id: 'purple', label: 'Purple', css: '#a855f7' },
];

const OUTFIT_OPTIONS: { id: PlayerOutfitId; label: string; desc: string }[] = [
  { id: 'tg_boss', label: 'TG Boss Black', desc: 'গ্যাং লিডার ট্যাকটিক্যাল জ্যাকেট' },
  { id: 'dmp_tac', label: 'DMP Blue Tac', desc: 'পুলিশ/ট্যাকটিক্যাল নেভি ব্লেজার' },
  { id: 'dhaka_panjabi', label: 'Dhaka Panjabi', desc: 'সাদা-গোল্ডেন দেশি পাঞ্জাবি সেট' },
  { id: 'racer_red', label: 'Street Racer Red', desc: 'হাই-স্পিড রেসিং জ্যাকেট' },
];

const GARAGE_VEHICLES: { id: string; label: string }[] = [
  { id: 'veh-suv', label: 'Toyota Prado TG-Spec' },
  { id: 'veh-coupe', label: 'Nissan GT-R Redline' },
  { id: 'veh-cng-1', label: 'Dhaka Metro CNG' },
  { id: 'veh-police', label: 'DMP Patrol Cruiser' },
];

const WEAPON_OPTIONS: {
  id: WeaponId;
  label: string;
  keyHint: string;
  dmg: number;
  rate: number;
  acc: number;
  rng: number;
  desc: string;
}[] = [
  { id: 'fists', label: 'Fists', keyHint: '1', dmg: 25, rate: 75, acc: 95, rng: 15, desc: 'Close-quarters street brawl' },
  { id: 'pistol', label: '9mm Pistol', keyHint: '2', dmg: 52, rate: 55, acc: 86, rng: 68, desc: 'Sidearm · Crisp ADS precision' },
  { id: 'smg', label: 'Micro SMG', keyHint: '3', dmg: 38, rate: 95, acc: 64, rng: 56, desc: 'Full-auto · Drive-by ready' },
  { id: 'shotgun', label: 'Shotgun', keyHint: '4', dmg: 94, rate: 30, acc: 52, rng: 38, desc: '8-pellet close-range heavy punch' },
];

const RADIO_META: Record<RadioStationId, { name: string; freq: string; accent: string }> = {
  off: { name: 'Radio Off', freq: '--', accent: 'text-slate-400' },
  dhaka_bass: { name: 'Dhaka Bass FM', freq: '94.5', accent: 'text-emerald-300' },
  bangla_rock: { name: 'Bangla Rock', freq: '98.2', accent: 'text-rose-300' },
  vice_wave: { name: 'Vice 80s Wave', freq: '101.6', accent: 'text-fuchsia-300' },
  talk_dhaka: { name: 'Dhaka Talk Live', freq: '104.0', accent: 'text-amber-300' },
};

const StatusCircle: React.FC<{
  value: number;
  color: string;
  icon: React.ReactNode;
  label: string;
}> = ({ value, color, icon, label }) => {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/90"
      title={`${label}: ${clamped}%`}
    >
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="2.6"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-slate-100">{icon}</span>
    </div>
  );
};

export const FiveMHud: React.FC<FiveMHudProps> = ({
  hud,
  buildings,
  roads,
  crew,
  gpsLocations,
  hudHidden,
  muted,
  touchEnabled,
  weaponWheelOpen,
  phoneOpen,
  inventoryOpen,
  chatOpen,
  scoreboardOpen,
  customsOpen,
  heistOpen,
  onToggleHud,
  onToggleVehicle,
  onToggleHostage,
  onCycleHostageDialogue,
  onStartRobbery,
  onInteractService,
  onToggleHeadlights,
  onHonk,
  onSelectTime,
  onToggleMute,
  onToggleTouch,
  onToggleWeaponWheel,
  onTogglePhone,
  onToggleInventory,
  onToggleChat,
  onToggleScoreboard,
  onToggleCustoms,
  onToggleHeist,
  onSendServerChat,
  onUpdateProfile,
  onTogglePassive,
  onAskRoleChat,
  onPlayEmotion,
  onReplayVoice,
  onSelectWeapon,
  onReload,
  onDepositCash,
  onWithdrawCash,
  onSelectGps,
  onCallMechanic,
  onUseItem,
  onBuyItem,
  onStartJob,
  onCancelJob,
  onApplyVehicleUpgrade,
  onBuyProperty,
  onSetSpawnProperty,
  onRestApartment,
  onEquipOutfit,
  onSummonGarageVehicle,
  onStartHeistSetup,
  onStartBankHeistFinale,
  onAdvanceHeistMinigame,
  onPlayHeistDrillTick,
  onCancelHeistMission,
  onCycleRadio,
  onSwitchProtagonist,
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const serverChatScrollRef = useRef<HTMLDivElement>(null);
  const [phoneTab, setPhoneTab] = useState<'bkash' | 'jobs' | 'gps' | 'mechanic' | 'property' | 'social'>('bkash');
  const [wantedBorderBlue, setWantedBorderBlue] = useState(false);
  const [chatTab, setChatTab] = useState<'server' | 'npc'>('server');
  const [serverChannel, setServerChannel] = useState<'global' | 'local' | 'me' | 'do'>('global');
  const [serverChatInput, setServerChatInput] = useState('');
  const [editName, setEditName] = useState(hud.mpPlayerName);
  const [editTag, setEditTag] = useState(hud.mpGangTag);
  const [plateDraft, setPlateDraft] = useState(hud.vehicleUpgrades?.plateText || 'DHAKA-01');
  const [hackNodes, setHackNodes] = useState<number[]>([1, 4, 7, 2]);
  const [hackTargets, setHackTargets] = useState<number[]>([5, 3, 7, 4]);
  const [hackLocked, setHackLocked] = useState<boolean[]>([false, false, false, false]);
  const [drillProgress, setDrillProgress] = useState(0);
  const [drillHeat, setDrillHeat] = useState(0);
  const [drilling, setDrilling] = useState(false);
  const [drillJammed, setDrillJammed] = useState(false);
  const drillSoundTickRef = useRef(0);
  const [selectedRole, setSelectedRole] = useState<ChatRole>('doctor');
  const [voiceIsFemale, setVoiceIsFemale] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<
    {
      id: string;
      role: ChatRole;
      isUser: boolean;
      sender: string;
      text: string;
      emotion: ChatEmotion;
      isFemaleVoice: boolean;
    }[]
  >([]);

  useEffect(() => {
    if (hud.wantedStars <= 0) {
      setWantedBorderBlue(false);
      return;
    }
    const timer = window.setInterval(() => {
      setWantedBorderBlue((prev) => !prev);
    }, 340);
    return () => clearInterval(timer);
  }, [hud.wantedStars]);

  useEffect(() => {
    if (hud.vehicleUpgrades?.plateText) {
      setPlateDraft(hud.vehicleUpgrades.plateText);
    }
  }, [hud.vehicleUpgrades?.plateText, customsOpen]);

  // Reset and run Dhaka Bank Circuit Hack Minigame
  useEffect(() => {
    if (hud.heist.stage !== 'finale_hack') {
      setHackLocked([false, false, false, false]);
      return;
    }
    setHackTargets([
      2 + Math.floor(Math.random() * 6),
      2 + Math.floor(Math.random() * 6),
      2 + Math.floor(Math.random() * 6),
      2 + Math.floor(Math.random() * 6),
    ]);
    setHackLocked([false, false, false, false]);
  }, [hud.heist.stage]);

  useEffect(() => {
    if (hud.heist.stage !== 'finale_hack') return;
    const timer = window.setInterval(() => {
      setHackNodes((prev) =>
        prev.map((val, idx) => (hackLocked[idx] ? val : (val % 8) + 1))
      );
    }, 430);
    return () => clearInterval(timer);
  }, [hud.heist.stage, hackLocked]);

  useEffect(() => {
    if (hud.heist.stage === 'finale_hack' && hackLocked.every(Boolean)) {
      const doneTimer = window.setTimeout(() => {
        onAdvanceHeistMinigame('finale_drill');
      }, 360);
      return () => clearTimeout(doneTimer);
    }
  }, [hud.heist.stage, hackLocked, onAdvanceHeistMinigame]);

  // Reset and run Thermal Drill Minigame
  useEffect(() => {
    if (hud.heist.stage !== 'finale_drill') {
      setDrillProgress(0);
      setDrillHeat(0);
      setDrilling(false);
      setDrillJammed(false);
      return;
    }
  }, [hud.heist.stage]);

  useEffect(() => {
    if (hud.heist.stage !== 'finale_drill') return;
    const timer = window.setInterval(() => {
      setDrillHeat((prevHeat) => {
        let nextHeat = prevHeat;
        if (drilling && !drillJammed) {
          nextHeat = Math.min(100, prevHeat + 2.1);
          if (nextHeat >= 96) {
            setDrillJammed(true);
            setDrilling(false);
          }
          drillSoundTickRef.current += 1;
          if (drillSoundTickRef.current % 4 === 0) {
            onPlayHeistDrillTick(nextHeat / 100);
          }
        } else {
          nextHeat = Math.max(0, prevHeat - 2.6);
          if (drillJammed && nextHeat <= 40) {
            setDrillJammed(false);
          }
        }
        return nextHeat;
      });

      if (drilling && !drillJammed) {
        setDrillProgress((prevProg) => {
          const next = Math.min(100, prevProg + 1.25);
          if (next >= 100 && prevProg < 100) {
            window.setTimeout(() => onAdvanceHeistMinigame('finale_escape'), 250);
          }
          return next;
        });
      }
    }, 60);
    return () => clearInterval(timer);
  }, [hud.heist.stage, drilling, drillJammed, onAdvanceHeistMinigame, onPlayHeistDrillTick]);

  useEffect(() => {
    if (!scoreboardOpen) return;
    setEditName(hud.mpPlayerName);
    setEditTag(hud.mpGangTag);
  }, [scoreboardOpen, hud.mpPlayerName, hud.mpGangTag]);

  useEffect(() => {
    if (!chatOpen) return;
    if (hud.hasHostage) {
      setSelectedRole('hostage');
      setVoiceIsFemale(ROLE_META.hostage.isFemaleVoice);
      setChatTab('npc');
    } else if (hud.nearServiceNpc && hud.nearServiceNpc.role in ROLE_META) {
      const nextRole = hud.nearServiceNpc.role as ChatRole;
      setSelectedRole(nextRole);
      setVoiceIsFemale(ROLE_META[nextRole].isFemaleVoice);
      setChatTab('npc');
    }
  }, [chatOpen, hud.hasHostage, hud.nearServiceNpc]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatOpen, chatTab]);

  useEffect(() => {
    if (serverChatScrollRef.current) {
      serverChatScrollRef.current.scrollTop = serverChatScrollRef.current.scrollHeight;
    }
  }, [hud.mpChatFeed, chatOpen, chatTab]);

  const submitServerChat = () => {
    const clean = serverChatInput.trim();
    if (!clean) return;
    onSendServerChat(serverChannel, clean);
    setServerChatInput('');
  };

  const submitRoleQuestion = (questionText: string) => {
    const clean = questionText.trim();
    if (!clean) return;
    const reply = onAskRoleChat(selectedRole, clean, voiceIsFemale);
    const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setChatMessages((prev) => [
      ...prev.slice(-24),
      {
        id: `u-${ts}`,
        role: selectedRole,
        isUser: true,
        sender: 'আপনি',
        text: clean,
        emotion: 'neutral',
        isFemaleVoice: false,
      },
      ...(reply
        ? [
            {
              id: `r-${ts}`,
              role: reply.role,
              isUser: false,
              sender: reply.speakerName,
              text: reply.text,
              emotion: reply.emotion,
              isFemaleVoice: reply.isFemaleVoice,
            },
          ]
        : []),
    ]);
    setChatInput('');
  };

  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas || hudHidden) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 1.05;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1522';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(hud.playerHeading);
    ctx.translate(-hud.playerX * scale, -hud.playerZ * scale);

    for (const r of roads) {
      ctx.fillStyle = r.isDivider ? '#e2e8f0' : '#334155';
      ctx.fillRect(
        (r.x - r.w / 2) * scale,
        (r.z - r.d / 2) * scale,
        r.w * scale,
        r.d * scale
      );
    }

    for (const b of buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(
        (b.x - b.w / 2) * scale,
        (b.z - b.d / 2) * scale,
        b.w * scale,
        b.d * scale
      );
    }

    // Gang Turf Zones
    for (const turf of hud.turfZones) {
      ctx.save();
      ctx.fillStyle = turf.owner === 'TG' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.strokeStyle = turf.owner === 'TG' ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(turf.x * scale, turf.z * scale, turf.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Active Job Route & Target Beacon
    if (hud.activeJob) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(hud.playerX * scale, hud.playerZ * scale);
      ctx.lineTo(hud.activeJob.targetX * scale, hud.activeJob.targetZ * scale);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hud.activeJob.targetX * scale, hud.activeJob.targetZ * scale, 6.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // GPS Route & Beacon
    if (hud.gpsTarget) {
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(hud.playerX * scale, hud.playerZ * scale);
      ctx.lineTo(hud.gpsTarget.x * scale, hud.gpsTarget.z * scale);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(hud.gpsTarget.x * scale, hud.gpsTarget.z * scale, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(hud.gpsTarget.x * scale, hud.gpsTarget.z * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dhaka Customs Bay & Dynasty 8 Properties
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(DHAKA_CUSTOMS_POS.x * scale - 3.5, DHAKA_CUSTOMS_POS.z * scale - 3.5, 7, 7);

    for (const prop of hud.properties) {
      ctx.fillStyle = prop.owned ? '#10b981' : '#38bdf8';
      ctx.fillRect(prop.x * scale - 3, prop.z * scale - 3, 6, 6);
    }

    // Active Bank Heist Route & Target Beacon
    if (
      hud.heist.stage === 'setup_hack_van' ||
      hud.heist.stage === 'setup_kuruma' ||
      hud.heist.stage === 'finale_approach' ||
      hud.heist.stage === 'finale_escape'
    ) {
      const hColor = hud.heist.stage === 'finale_escape' ? '#10b981' : '#ef4444';
      ctx.save();
      ctx.strokeStyle = hColor;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(hud.playerX * scale, hud.playerZ * scale);
      ctx.lineTo(hud.heist.targetX * scale, hud.heist.targetZ * scale);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = hColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hud.heist.targetX * scale, hud.heist.targetZ * scale, 6.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Robbery spots ($)
    for (const spot of hud.robberySpots) {
      ctx.fillStyle = spot.ready ? '#f59e0b' : '#64748b';
      ctx.beginPath();
      ctx.arc(spot.x * scale, spot.z * scale, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // NPC dots (Medical, Shopkeepers, Dealers, Civilians)
    for (const n of hud.npcs) {
      if (n.role === 'doctor' || n.role === 'nurse') {
        ctx.fillStyle = n.role === 'doctor' ? '#22d3ee' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(n.x * scale, n.z * scale, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (n.role === 'shopkeeper' || n.role === 'dealer') {
        ctx.fillStyle = n.role === 'shopkeeper' ? '#fbbf24' : '#c084fc';
        ctx.beginPath();
        ctx.arc(n.x * scale, n.z * scale, 2.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = n.isHostage ? '#ec4899' : n.panicked ? '#f97316' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(n.x * scale, n.z * scale, n.isHostage ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Vehicle blips + GTA 5 Police Vision Cones
    for (const v of hud.vehicles) {
      if (v.kind === 'police' && hud.wantedStars > 0 && typeof v.heading === 'number') {
        const vx = v.x * scale;
        const vz = v.z * scale;
        const coneAngle = Math.PI / 2 - v.heading;
        const coneLen = 28;
        const halfSpread = 0.44;
        ctx.save();
        ctx.fillStyle = wantedBorderBlue ? 'rgba(59, 130, 246, 0.24)' : 'rgba(239, 68, 68, 0.24)';
        ctx.beginPath();
        ctx.moveTo(vx, vz);
        ctx.arc(vx, vz, coneLen, coneAngle - halfSpread, coneAngle + halfSpread);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = v.chasing
        ? '#ef4444'
        : v.kind === 'police'
        ? '#3b82f6'
        : v.kind === 'ambulance'
        ? '#ffffff'
        : v.kind === 'cng'
        ? '#22c55e'
        : v.kind === 'coupe'
        ? '#f43f5e'
        : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(v.x * scale, v.z * scale, v.chasing ? 4 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Remote Multiplayer Player Blips (GTA Online style: flashing Red/Blue if Wanted, faded if Passive)
    const wantedFlash = Math.floor(Date.now() / 320) % 2 === 0;
    for (const rp of hud.remotePlayers) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(rp.x * scale, rp.z * scale, rp.wantedStars > 0 ? 4.4 : 3.8, 0, Math.PI * 2);
      if (rp.passiveMode) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.48)';
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      } else if (rp.wantedStars > 0) {
        ctx.fillStyle = wantedFlash ? '#ef4444' : '#3b82f6';
        ctx.strokeStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#ffffff';
      }
      ctx.lineWidth = 1.1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(5, 5.5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud, buildings, roads, hudHidden, wantedBorderBlue]);

  if (hudHidden) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <button
          type="button"
          onClick={onToggleHud}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-900 cursor-pointer"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          Show HUD
        </button>
      </div>
    );
  }

  const handlePrimaryPromptClick = () => {
    if (hud.nearCustomsBay && hud.inVehicle) onToggleCustoms();
    else if (hud.nearServiceNpc) onInteractService();
    else if (hud.nearRobberyName) onStartRobbery();
    else if (hud.nearProperty) {
      if (hud.nearProperty.owned && hud.nearProperty.hasHeistRoom) {
        onToggleHeist();
      } else {
        setPhoneTab('property');
        if (!phoneOpen) onTogglePhone();
      }
    } else if (hud.nearVehicleName) onToggleVehicle();
    else if (hud.canTakeHostage) onToggleHostage();
  };

  const gpsDistMeters = hud.gpsTarget
    ? Math.round(Math.hypot(hud.gpsTarget.x - hud.playerX, hud.gpsTarget.z - hud.playerZ))
    : 0;

  const hasHeistApt = hud.properties.some((p) => p.owned && p.hasHeistRoom);
  const ownedPropCount = hud.properties.filter((p) => p.owned).length;
  const totalFunds = hud.cash + hud.bank;
  const vUpg = hud.vehicleUpgrades;

  const activeWeaponMeta = WEAPON_OPTIONS.find((w) => w.id === hud.equippedWeapon) ?? WEAPON_OPTIONS[0];
  const radioMeta = RADIO_META[hud.radioStation] ?? RADIO_META.off;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4 transition-all duration-500 ${
        hud.lifeState !== 'alive' ? 'grayscale contrast-125' : ''
      }`}
    >
      {/* GTA 5 WASTED / BUSTED Cinematic Overlay */}
      {hud.lifeState !== 'alive' && (
        <div className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/55">
          <div
            className={`font-display text-5xl sm:text-7xl font-black tracking-[0.18em] uppercase drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] ${
              hud.lifeState === 'wasted' ? 'text-rose-500' : 'text-sky-400'
            }`}
          >
            {hud.lifeState === 'wasted' ? 'WASTED' : 'BUSTED'}
          </div>
          {hud.lifeMessage && (
            <div className="mt-3 max-w-md rounded-lg border border-white/15 bg-slate-950/90 px-4 py-2 text-center text-xs sm:text-sm font-medium text-slate-100">
              {hud.lifeMessage}
            </div>
          )}
        </div>
      )}

      {/* GTA 5 / GTA 6 Dual-Protagonist Camera Swoop Banner */}
      {hud.switchingCharacter && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-30 rounded-lg border border-amber-400/50 bg-slate-950/90 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-200 shadow-xl">
          Switching to {hud.protagonist === 'nadia' ? 'Nadia (Lucia) Rahman' : 'BOSS Sadik'}...
        </div>
      )}

      {/* Dynamic ADS Crosshair & Hit-Marker */}
      {!hud.inVehicle && hud.equippedWeapon !== 'fists' && hud.lifeState === 'alive' && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              className={`rounded-full border transition-all duration-150 ${
                hud.aiming
                  ? 'h-5 w-5 border-rose-400 bg-rose-500/20'
                  : 'h-2.5 w-2.5 border-white/85 bg-red-500/70'
              }`}
            />
            {hud.aiming && (
              <>
                <span className="absolute -top-2.5 h-1.5 w-0.5 bg-white/90" />
                <span className="absolute -bottom-2.5 h-1.5 w-0.5 bg-white/90" />
                <span className="absolute -left-2.5 h-0.5 w-1.5 bg-white/90" />
                <span className="absolute -right-2.5 h-0.5 w-1.5 bg-white/90" />
              </>
            )}
            {hud.hitMarker && (
              <div className="absolute h-6 w-6 rotate-45">
                <span className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-rose-400" />
                <span className="absolute left-1/2 bottom-0 h-2 w-0.5 -translate-x-1/2 bg-rose-400" />
                <span className="absolute top-1/2 left-0 h-0.5 w-2 -translate-y-1/2 bg-rose-400" />
                <span className="absolute top-1/2 right-0 h-0.5 w-2 -translate-y-1/2 bg-rose-400" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* GTA 5 Radial Weapon Wheel Modal */}
      {weaponWheelOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4">
          <div className="w-[330px] rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-display text-sm font-bold text-white">GTA Radial Weapon Wheel</span>
              <button
                type="button"
                onClick={onToggleWeaponWheel}
                className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                Close [Tab]
              </button>
            </div>

            <div className="relative mx-auto my-4 flex h-56 w-56 items-center justify-center">
              <svg viewBox="0 0 220 220" className="h-full w-full">
                {/* 4 Radial Quadrants: Top=Fists, Right=Pistol, Bottom=SMG, Left=Shotgun */}
                {(
                  [
                    {
                      w: WEAPON_OPTIONS[0],
                      d: 'M110,110 L42,42 A96,96 0 0,1 178,42 Z',
                      lx: 110,
                      ly: 38,
                    },
                    {
                      w: WEAPON_OPTIONS[1],
                      d: 'M110,110 L178,42 A96,96 0 0,1 178,178 Z',
                      lx: 180,
                      ly: 110,
                    },
                    {
                      w: WEAPON_OPTIONS[2],
                      d: 'M110,110 L178,178 A96,96 0 0,1 42,178 Z',
                      lx: 110,
                      ly: 184,
                    },
                    {
                      w: WEAPON_OPTIONS[3],
                      d: 'M110,110 L42,178 A96,96 0 0,1 42,42 Z',
                      lx: 40,
                      ly: 110,
                    },
                  ] as const
                ).map((seg) => {
                  const active = hud.equippedWeapon === seg.w.id;
                  return (
                    <g
                      key={seg.w.id}
                      onClick={() => {
                        onSelectWeapon(seg.w.id);
                        onToggleWeaponWheel();
                      }}
                      className="cursor-pointer"
                    >
                      <path
                        d={seg.d}
                        fill={active ? '#0f766e' : '#111827'}
                        stroke={active ? '#2dd4bf' : '#334155'}
                        strokeWidth={active ? '2.5' : '1.5'}
                      />
                      <text
                        x={seg.lx}
                        y={seg.ly - 4}
                        textAnchor="middle"
                        fill={active ? '#ffffff' : '#cbd5e1'}
                        fontSize="11"
                        fontWeight="700"
                      >
                        {seg.w.label}
                      </text>
                      <text
                        x={seg.lx}
                        y={seg.ly + 10}
                        textAnchor="middle"
                        fill={active ? '#99f6e4' : '#64748b'}
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        [{seg.w.keyHint}]
                      </text>
                    </g>
                  );
                })}
                <circle cx="110" cy="110" r="40" fill="#020617" stroke="#334155" strokeWidth="2" />
              </svg>

              <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
                <Crosshair className="h-4 w-4 text-teal-400" />
                <span className="mt-0.5 text-[10px] font-bold text-white leading-tight">
                  {activeWeaponMeta.label}
                </span>
                <span className="font-hud-mono text-[9px] text-amber-300">
                  {hud.equippedWeapon === 'fists'
                    ? 'MELEE'
                    : `${hud.ammoInMag}/${hud.ammoReserve}`}
                </span>
              </div>
            </div>

            {/* Selected Weapon Stat Bars */}
            <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 text-[10.5px]">
              <div className="text-slate-300 font-medium">{activeWeaponMeta.desc}</div>
              {(
                [
                  { label: 'Damage', val: activeWeaponMeta.dmg, color: 'bg-rose-500' },
                  { label: 'Fire Rate', val: activeWeaponMeta.rate, color: 'bg-amber-400' },
                  { label: 'Accuracy', val: activeWeaponMeta.acc, color: 'bg-cyan-400' },
                  { label: 'Range', val: activeWeaponMeta.rng, color: 'bg-emerald-400' },
                ] as const
              ).map((stat) => (
                <div key={stat.label} className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-4 text-slate-400">{stat.label}</span>
                  <div className="col-span-8 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full ${stat.color}`} style={{ width: `${stat.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Smartphone Modal (bKash / Jobs / GPS / Mech / Dynasty8 / DhakaGram Social) */}
      {phoneOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-4">
          <div className="w-80 sm:w-[340px] overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-teal-400" />
                <span className="font-display text-sm font-bold text-white">Dhaka Phone</span>
              </div>
              <button
                type="button"
                onClick={onTogglePhone}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Close Phone"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-6 border-b border-slate-800 bg-slate-900/60 p-1 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setPhoneTab('bkash')}
                className={`rounded-md py-1.5 cursor-pointer whitespace-nowrap ${
                  phoneTab === 'bkash' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                bKash
              </button>
              <button
                type="button"
                onClick={() => setPhoneTab('jobs')}
                className={`rounded-md py-1.5 cursor-pointer whitespace-nowrap ${
                  phoneTab === 'jobs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Jobs
              </button>
              <button
                type="button"
                onClick={() => setPhoneTab('gps')}
                className={`rounded-md py-1.5 cursor-pointer whitespace-nowrap ${
                  phoneTab === 'gps' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                GPS
              </button>
              <button
                type="button"
                onClick={() => setPhoneTab('mechanic')}
                className={`rounded-md py-1.5 cursor-pointer whitespace-nowrap ${
                  phoneTab === 'mechanic' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mech
              </button>
              <button
                type="button"
                onClick={() => setPhoneTab('property')}
                className={`rounded-md py-1.5 cursor-pointer whitespace-nowrap ${
                  phoneTab === 'property' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Homes
              </button>
              <button
                type="button"
                onClick={() => setPhoneTab('social')}
                className={`rounded-md py-1.5 cursor-pointer whitespace-nowrap ${
                  phoneTab === 'social' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Social
              </button>
            </div>

            <div className="p-4">
              {phoneTab === 'social' && (
                <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-300">DhakaGram · Live City Feed</span>
                    <span className="font-hud-mono text-[10px] text-slate-400">
                      {hud.socialFeed.length} Viral Clips
                    </span>
                  </div>
                  {hud.socialFeed.map((post) => (
                    <div
                      key={post.id}
                      className={`rounded-xl border p-2.5 text-xs ${
                        post.highlight
                          ? 'border-rose-500/40 bg-rose-950/20'
                          : 'border-slate-800 bg-slate-900/90'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-white truncate">{post.author}</span>{' '}
                          <span className="font-hud-mono text-[10px] text-sky-400">{post.handle}</span>
                        </div>
                        <span className="font-hud-mono text-[10px] text-slate-500 shrink-0">
                          {post.timeAgo}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-200 leading-relaxed">{post.caption}</p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-hud-mono">
                        <span className="text-rose-300">{post.tag}</span>
                        <span className="text-slate-400">♥ {post.likes.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {phoneTab === 'jobs' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Dhaka City Roleplay Jobs</span>
                    <span className="font-hud-mono text-emerald-400">
                      Done: {hud.completedJobs} · RP {hud.gangRep}
                    </span>
                  </div>
                  {(
                    [
                      {
                        kind: 'cng_ride',
                        name: 'CNG / Uber Ride',
                        pay: '৳2,600',
                        desc: 'যাত্রী তুলে গন্তব্যে পৌঁছে দিন',
                        icon: <CarFront className="h-4 w-4 text-emerald-400" />,
                      },
                      {
                        kind: 'paramedic',
                        name: 'DMCH Paramedic',
                        pay: '৳4,500',
                        desc: 'আহত রোগীকে চিকিৎসা দিয়ে মেডিকেলে আনুন',
                        icon: <Stethoscope className="h-4 w-4 text-rose-400" />,
                      },
                      {
                        kind: 'delivery',
                        name: 'Food / Tong Delivery',
                        pay: '৳1,900',
                        desc: 'টং দোকান থেকে খাবার ডেলিভারি দিন',
                        icon: <Package className="h-4 w-4 text-amber-400" />,
                      },
                      {
                        kind: 'police_patrol',
                        name: 'DMP City Patrol',
                        pay: '৳3,600',
                        desc: 'পুলিশ চেকপয়েন্ট টহল ও কেস ক্লিয়ার',
                        icon: <ShieldAlert className="h-4 w-4 text-sky-400" />,
                      },
                    ] as const
                  ).map((job) => {
                    const isRunning = hud.activeJob?.kind === job.kind;
                    return (
                      <button
                        key={job.kind}
                        type="button"
                        onClick={() => {
                          onStartJob(job.kind);
                          onTogglePhone();
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                          isRunning
                            ? 'border-emerald-400 bg-emerald-950/50'
                            : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {job.icon}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{job.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{job.desc}</div>
                          </div>
                        </div>
                        <span className="font-hud-mono text-xs font-bold text-emerald-400 ml-2 shrink-0">
                          {job.pay}
                        </span>
                      </button>
                    );
                  })}
                  {hud.activeJob && (
                    <button
                      type="button"
                      onClick={onCancelJob}
                      className="w-full rounded-lg border border-rose-500/40 bg-rose-950/50 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                    >
                      Cancel Current Job
                    </button>
                  )}
                </div>
              )}

              {phoneTab === 'bkash' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-pink-500/30 bg-pink-950/25 p-3">
                    <div className="text-[11px] font-medium text-pink-300">bKash / Dhaka Bank Balance</div>
                    <div className="mt-1 flex items-baseline justify-between font-hud-mono">
                      <span className="text-lg font-bold text-sky-400">৳{hud.bank.toLocaleString()}</span>
                      <span className="text-xs text-emerald-400">Cash: ৳{hud.cash.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold text-slate-400">Deposit Cash to Bank</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1000, 5000].map((amt) => (
                        <button
                          key={`dep-${amt}`}
                          type="button"
                          onClick={() => onDepositCash(amt)}
                          disabled={hud.cash <= 0}
                          className="rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                        >
                          +৳{amt.toLocaleString()}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onDepositCash(hud.cash)}
                        disabled={hud.cash <= 0}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/60 disabled:opacity-40 cursor-pointer"
                      >
                        All
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold text-slate-400">Withdraw Cash Out</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[1000, 5000, 10000].map((amt) => (
                        <button
                          key={`wit-${amt}`}
                          type="button"
                          onClick={() => onWithdrawCash(amt)}
                          disabled={hud.bank <= 0}
                          className="rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-sky-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                        >
                          -৳{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {phoneTab === 'gps' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Select destination on radar</span>
                    {hud.gpsTarget && (
                      <button
                        type="button"
                        onClick={() => onSelectGps(null)}
                        className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Clear Route
                      </button>
                    )}
                  </div>
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {gpsLocations.map((loc) => {
                      const dist = Math.round(Math.hypot(loc.x - hud.playerX, loc.z - hud.playerZ));
                      const active = hud.gpsTarget?.id === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            onSelectGps(loc);
                            onTogglePhone();
                          }}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                            active
                              ? 'border-cyan-400 bg-cyan-950/60 text-cyan-100'
                              : 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-2 font-medium truncate">
                            <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{loc.name}</span>
                          </span>
                          <span className="font-hud-mono text-[11px] text-slate-400 ml-2 shrink-0">
                            {dist}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {phoneTab === 'mechanic' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-slate-200 leading-relaxed">
                    {hud.inVehicle
                      ? 'আপনার বর্তমান গাড়ি ফুল রিপেয়ার ও ট্যাংক ফুল ফুয়েল করতে মেকানিক ডাকুন।'
                      : 'রাস্তার যেখানে আছেন সেখানে আপনার Toyota Prado TG-Spec ডেলিভারি নিন।'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onCallMechanic();
                      onTogglePhone();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-500 cursor-pointer"
                  >
                    <Wrench className="h-4 w-4" />
                    <span>
                      {hud.inVehicle
                        ? 'Repair & Refuel Car (৳400)'
                        : 'Call Garage Prado Delivery (৳500)'}
                    </span>
                  </button>
                </div>
              )}

              {phoneTab === 'property' && (
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5 font-semibold text-indigo-300">
                      <Building2 className="h-3.5 w-3.5" />
                      Dynasty 8 Real Estate
                    </span>
                    <span className="font-hud-mono text-emerald-400">
                      Funds: ৳{totalFunds.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {hud.properties.map((prop) => {
                      const isSpawn = hud.spawnPropertyId === prop.id;
                      return (
                        <div
                          key={prop.id}
                          className={`rounded-xl border p-2.5 text-xs ${
                            prop.owned
                              ? 'border-emerald-500/40 bg-emerald-950/20'
                              : 'border-slate-800 bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{prop.name}</div>
                              <div className="mt-0.5 font-hud-mono text-[10px] text-slate-400">
                                {prop.district} · {prop.garageSlots}-Car Garage
                                {prop.hasHeistRoom ? ' · Heist Room' : ''}
                              </div>
                            </div>
                            <span className="font-hud-mono text-[11px] font-bold text-amber-300 shrink-0">
                              {prop.owned ? 'OWNED' : `৳${prop.price.toLocaleString()}`}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {!prop.owned ? (
                              <button
                                type="button"
                                onClick={() => onBuyProperty(prop.id)}
                                disabled={totalFunds < prop.price}
                                className="rounded-md bg-indigo-600 px-2.5 py-1 text-[10.5px] font-bold text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                              >
                                Buy Property
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onSetSpawnProperty(isSpawn ? null : prop.id)}
                                  className={`rounded-md px-2 py-1 text-[10.5px] font-semibold cursor-pointer whitespace-nowrap ${
                                    isSpawn
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                                  }`}
                                >
                                  {isSpawn ? 'Spawn: Active' : 'Set Spawn'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRestApartment(prop.id)}
                                  className="rounded-md bg-slate-800 px-2 py-1 text-[10.5px] font-semibold text-teal-300 hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                                >
                                  Rest 100%
                                </button>
                                {prop.hasHeistRoom && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onTogglePhone();
                                      onToggleHeist();
                                    }}
                                    className="rounded-md bg-rose-700 px-2 py-1 text-[10.5px] font-bold text-white hover:bg-rose-600 cursor-pointer whitespace-nowrap"
                                  >
                                    Heist Board
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onSelectGps({ id: prop.id, name: prop.name, x: prop.x, z: prop.z });
                                onTogglePhone();
                              }}
                              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10.5px] text-cyan-300 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                            >
                              GPS
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Wardrobe Outfits */}
                  <div className="border-t border-slate-800 pt-2.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                      <Shirt className="h-3.5 w-3.5 text-pink-400" />
                      <span>Apartment Wardrobe (Outfits)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {OUTFIT_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => onEquipOutfit(o.id)}
                          className={`rounded-lg border px-2 py-1.5 text-left text-[10.5px] cursor-pointer ${
                            hud.equippedOutfit === o.id
                              ? 'border-pink-400 bg-pink-950/50 text-white'
                              : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="font-bold truncate">{o.label}</div>
                          <div className="text-[9.5px] text-slate-400 truncate">{o.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 10-Car Garage Vehicle Summon */}
                  <div className="border-t border-slate-800 pt-2.5">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Garage Delivery</span>
                      </span>
                      <span className="font-hud-mono text-[10px] text-slate-400">
                        {ownedPropCount > 0 ? 'Unlocked' : 'Buy Apt First'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {GARAGE_VEHICLES.map((gv) => (
                        <button
                          key={gv.id}
                          type="button"
                          disabled={ownedPropCount === 0}
                          onClick={() => {
                            onSummonGarageVehicle(gv.id);
                            onTogglePhone();
                          }}
                          className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-left text-[10.5px] font-medium text-slate-200 hover:border-emerald-400/60 hover:bg-slate-800 disabled:opacity-40 cursor-pointer truncate"
                        >
                          {gv.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory / Bag Modal */}
      {inventoryOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-4">
          <div className="w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Backpack className="h-4 w-4 text-emerald-400" />
                <span className="font-display text-sm font-bold text-white">Backpack & Supplies</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-hud-mono text-xs font-semibold text-emerald-400">
                  ৳{hud.cash.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={onToggleInventory}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                  aria-label="Close Backpack"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto p-3">
              {hud.inventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{item.name}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-hud-mono text-[10px] text-teal-300">
                        x{item.count}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400 truncate">{item.description}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUseItem(item.id)}
                      disabled={item.count <= 0}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-35 cursor-pointer"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuyItem(item.id)}
                      disabled={hud.cash < item.price}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-hud-mono text-[11px] font-semibold text-amber-300 hover:bg-slate-700 disabled:opacity-35 cursor-pointer"
                    >
                      ৳{item.price}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dhaka Customs (Los Santos Customs) Tuning Workshop Modal (U) */}
      {customsOpen && vUpg && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-3 sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Dhaka Customs · LS Tuning Bay
                  </div>
                  <div className="font-hud-mono text-[10.5px] text-slate-300">
                    {hud.inVehicle ? hud.vehicleName : 'Personal Toyota Prado TG-Spec'} · Funds ৳
                    {totalFunds.toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleCustoms}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Close Dhaka Customs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4 text-xs">
              {/* Repair & Status Bar */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2.5">
                <div>
                  <div className="font-bold text-white">Vehicle Condition & Fuel</div>
                  <div className="font-hud-mono text-[11px] text-slate-400">
                    HP {hud.vehicleHealth}% · Fuel {hud.vehicleFuel}% · Plate {vUpg.plateText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyVehicleUpgrade({}, 400, true)}
                  disabled={totalFunds < 400}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  Repair & Refuel (৳400)
                </button>
              </div>

              {/* Paint Color & Finish */}
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-white">
                    <Palette className="h-3.5 w-3.5 text-cyan-400" />
                    Respray Paint ({vUpg.paintName})
                  </span>
                  <span className="font-hud-mono text-[10.5px] text-amber-300">৳1,200 / Spray</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CUSTOMS_PAINTS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        onApplyVehicleUpgrade({ paintHex: p.hex, paintName: p.name }, 1200)
                      }
                      disabled={totalFunds < 1200}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer disabled:opacity-40 ${
                        vUpg.paintHex === p.hex
                          ? 'border-cyan-400 bg-cyan-950/60 text-white'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-white/40"
                        style={{ backgroundColor: p.css }}
                      />
                      <span className="whitespace-nowrap">{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <div className="mb-1 text-[10.5px] font-semibold text-slate-400">
                    Coat Finish ({vUpg.finish.toUpperCase()})
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'metallic', label: 'Metallic', cost: 0 },
                        { id: 'matte', label: 'Matte', cost: 1500 },
                        { id: 'chrome', label: 'Chrome', cost: 4500 },
                      ] as { id: PaintFinish; label: string; cost: number }[]
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        disabled={vUpg.finish !== f.id && totalFunds < f.cost}
                        onClick={() => onApplyVehicleUpgrade({ finish: f.id }, f.cost)}
                        className={`rounded-lg border py-1.5 font-semibold cursor-pointer disabled:opacity-40 ${
                          vUpg.finish === f.id
                            ? 'border-cyan-400 bg-cyan-900/50 text-white'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {f.label} {f.cost > 0 ? `(৳${f.cost.toLocaleString()})` : '(Free)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance Mods (EMS Engine, Turbo, Armor, Brakes) */}
              <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="font-bold text-white">Performance & Armor Tuning</div>

                <div>
                  <div className="mb-1 flex justify-between text-[10.5px] text-slate-400">
                    <span>EMS Engine Upgrade (Top Speed + Accel)</span>
                    <span className="font-hud-mono text-cyan-300">Lv {vUpg.engineLevel}/4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((lv) => {
                      const cost = lv === 1 ? 2000 : lv === 2 ? 4500 : lv === 3 ? 7500 : 11000;
                      const active = vUpg.engineLevel >= lv;
                      return (
                        <button
                          key={`eng-${lv}`}
                          type="button"
                          disabled={active || totalFunds < cost}
                          onClick={() => onApplyVehicleUpgrade({ engineLevel: lv }, cost)}
                          className={`rounded-lg border py-1.5 text-[10.5px] font-semibold cursor-pointer disabled:opacity-50 ${
                            active
                              ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
                              : 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          EMS {lv} · ৳{(cost / 1000).toFixed(1)}k
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-[10.5px] text-slate-400">
                    <span>Armor Plating (Collision Resistance)</span>
                    <span className="font-hud-mono text-sky-300">{vUpg.armorLevel * 20}%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((lv) => {
                      const cost = lv * 2500;
                      const active = vUpg.armorLevel >= lv;
                      return (
                        <button
                          key={`arm-${lv}`}
                          type="button"
                          disabled={active || totalFunds < cost}
                          onClick={() => onApplyVehicleUpgrade({ armorLevel: lv }, cost)}
                          className={`rounded-lg border py-1.5 text-[10px] font-semibold cursor-pointer disabled:opacity-50 ${
                            active
                              ? 'border-sky-400 bg-sky-950/60 text-sky-200'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {lv * 20}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={vUpg.turbo || totalFunds < 8500}
                    onClick={() => onApplyVehicleUpgrade({ turbo: true }, 8500)}
                    className={`rounded-lg border px-3 py-2 font-bold cursor-pointer disabled:opacity-50 ${
                      vUpg.turbo
                        ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                        : 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    {vUpg.turbo ? 'Turbo Kit: INSTALLED' : 'Install Turbo (৳8,500)'}
                  </button>

                  <button
                    type="button"
                    disabled={vUpg.brakesLevel >= 3 || totalFunds < (vUpg.brakesLevel + 1) * 1800}
                    onClick={() => {
                      const next = Math.min(3, vUpg.brakesLevel + 1);
                      onApplyVehicleUpgrade({ brakesLevel: next }, next * 1800);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    {vUpg.brakesLevel >= 3
                      ? 'Race Brakes: MAX (Lv3)'
                      : `Upgrade Brakes Lv${vUpg.brakesLevel + 1} (৳${((vUpg.brakesLevel + 1) * 1800).toLocaleString()})`}
                  </button>
                </div>
              </div>

              {/* Neon Underglow & License Plate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-white">
                    <span>Neon Underglow</span>
                    <span className="font-hud-mono text-[10px] text-amber-300">৳2,200</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {NEON_KITS.map((nk) => (
                      <button
                        key={nk.id}
                        type="button"
                        disabled={vUpg.neon !== nk.id && nk.id !== 'none' && totalFunds < 2200}
                        onClick={() =>
                          onApplyVehicleUpgrade({ neon: nk.id }, nk.id === 'none' ? 0 : 2200)
                        }
                        className={`flex items-center justify-center gap-1 rounded border py-1 text-[10px] font-semibold cursor-pointer disabled:opacity-40 ${
                          vUpg.neon === nk.id
                            ? 'border-cyan-400 bg-cyan-950/60 text-white'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: nk.css }}
                        />
                        <span>{nk.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const clean = plateDraft.trim().toUpperCase();
                    if (!clean) return;
                    onApplyVehicleUpgrade({ plateText: clean }, 1000);
                  }}
                  className="flex flex-col justify-between"
                >
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-white">
                    <span>Dhaka Metro Plate</span>
                    <span className="font-hud-mono text-[10px] text-amber-300">৳1,000</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={10}
                      value={plateDraft}
                      onChange={(e) => setPlateDraft(e.target.value.toUpperCase())}
                      className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-hud-mono text-xs text-amber-200 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!plateDraft.trim() || totalFunds < 1000}
                      className="rounded-lg bg-cyan-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-cyan-500 disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Heist Planning Board Modal (K) */}
      {heistOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-3 sm:p-4">
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-rose-500/45 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-rose-400" />
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    The Dhaka Bank Job · Heist Planning Board
                  </div>
                  <div className="font-hud-mono text-[10.5px] text-emerald-400">
                    Potential Cut: ৳{hud.heist.potentialPayout.toLocaleString()} · Completed:{' '}
                    {hud.heist.completedHeists}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleHeist}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Close Heist Board"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-4 text-xs">
              {!hasHeistApt && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-amber-100">
                  <div className="font-bold">High-End Apartment প্রয়োজন</div>
                  <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
                    Heist Planning Room আনলক করতে গুলশান পেন্টহাউস (৳120,000) বা ধানমন্ডি ডুপ্লেক্স (৳185,000) কিনুন।
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleHeist();
                      setPhoneTab('property');
                      if (!phoneOpen) onTogglePhone();
                    }}
                    className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    Open Dynasty 8 Real Estate
                  </button>
                </div>
              )}

              {/* Setup 1 */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Setup 1: DMP Security Hack Van</span>
                    <span
                      className={`font-hud-mono text-[10px] font-bold ${
                        hud.heist.setup1Done ? 'text-emerald-400' : 'text-sky-300'
                      }`}
                    >
                      {hud.heist.setup1Done ? 'COMPLETED' : '+৳8,000'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    মিরপুর রোড থেকে পুলিশ হ্যাকিং ভ্যান নিয়ে সেফহাউসে ফিরুন।
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hasHeistApt || hud.heist.setup1Done}
                  onClick={() => {
                    onStartHeistSetup(1);
                    onToggleHeist();
                  }}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-500 disabled:opacity-40 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {hud.heist.setup1Done ? 'Done' : 'Launch'}
                </button>
              </div>

              {/* Setup 2 */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Setup 2: Armored Kuruma Getaway</span>
                    <span
                      className={`font-hud-mono text-[10px] font-bold ${
                        hud.heist.setup2Done ? 'text-emerald-400' : 'text-amber-300'
                      }`}
                    >
                      {hud.heist.setup2Done ? 'COMPLETED' : '+৳10,000 + Armor'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    বনানী গ্যারেজ থেকে আর্মার্ড কার আনলে Prado-তে ফ্রি Lv3 Armor যুক্ত হবে।
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hasHeistApt || hud.heist.setup2Done}
                  onClick={() => {
                    onStartHeistSetup(2);
                    onToggleHeist();
                  }}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-amber-500 disabled:opacity-40 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {hud.heist.setup2Done ? 'Done' : 'Launch'}
                </button>
              </div>

              {/* Finale */}
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-rose-200">
                      FINALE: Dhaka Bank Vault Breach
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-300">
                      ১) সার্কিট ফ্রিকোয়েন্সি হ্যাক · ২) থার্মাল ড্রিল ওভারহিট কন্ট্রোল · ৩) ৪-স্টার গেটঅ্যাওয়ে
                    </div>
                  </div>
                  <span className="font-hud-mono text-sm font-bold text-emerald-400 shrink-0">
                    ৳200,000
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasHeistApt || !hud.heist.setup1Done || !hud.heist.setup2Done}
                    onClick={() => {
                      onStartBankHeistFinale();
                      onToggleHeist();
                    }}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-40 cursor-pointer"
                  >
                    Start Bank Heist Finale
                  </button>
                  {hud.heist.stage !== 'idle' && hud.heist.stage !== 'ready_finale' && (
                    <button
                      type="button"
                      onClick={onCancelHeistMission}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                    >
                      Abort
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Heist Finale Minigame 1: Security Circuit Hack */}
      {hud.heist.stage === 'finale_hack' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-400/50 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="font-display text-sm font-bold text-white">
                  Dhaka Bank Vault · Security Circuit Hack
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelHeistMission}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Abort
              </button>
            </div>

            <p className="mt-2.5 text-[11px] text-slate-300">
              টার্গেট ফ্রিকোয়েন্সির সাথে মিলিয়ে প্রতিটি সিগন্যাল লক করুন (সঠিক মানের ±১ রেঞ্জে এলেই Lock চাপুন)।
            </p>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {hackNodes.map((val, idx) => {
                const target = hackTargets[idx];
                const locked = hackLocked[idx];
                const inRange = Math.abs(val - target) <= 1;
                return (
                  <div
                    key={`hack-${idx}`}
                    className={`flex flex-col items-center rounded-xl border p-2.5 ${
                      locked
                        ? 'border-emerald-400 bg-emerald-950/50'
                        : inRange
                        ? 'border-cyan-400 bg-cyan-950/40'
                        : 'border-slate-800 bg-slate-900'
                    }`}
                  >
                    <span className="font-hud-mono text-[10px] text-slate-400">CH-{idx + 1}</span>
                    <span className="mt-1 font-hud-mono text-xs text-amber-300">
                      Target: {target}
                    </span>
                    <span className="my-2 font-hud-mono text-2xl font-bold text-white">{val}</span>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (inRange) {
                          setHackLocked((prev) => prev.map((l, i) => (i === idx ? true : l)));
                        }
                      }}
                      className={`w-full rounded-md py-1.5 text-[11px] font-bold cursor-pointer ${
                        locked
                          ? 'bg-emerald-600 text-white'
                          : inRange
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {locked ? 'LOCKED' : 'Lock'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bank Heist Finale Minigame 2: Thermal Drill */}
      {hud.heist.stage === 'finale_drill' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" />
                <span className="font-display text-sm font-bold text-white">
                  Vault Thermal Drill · Breach Lock
                </span>
              </div>
              <button
                type="button"
                onClick={onCancelHeistMission}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Abort
              </button>
            </div>

            <p className="mt-2.5 text-[11px] text-slate-300">
              ড্রিল বোতাম চেপে ধরে রাখুন — তাপমাত্রা ৯৫% ছাড়ালে ওভারহিট জ্যাম হবে, তাই মাঝে মাঝে ছেড়ে ঠান্ডা করুন!
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between font-hud-mono text-xs">
                  <span className="text-emerald-300">Vault Lock Progress</span>
                  <span className="text-white">{Math.round(drillProgress)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.round(drillProgress)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between font-hud-mono text-xs">
                  <span className={drillJammed ? 'text-rose-400 font-bold' : 'text-amber-300'}>
                    {drillJammed ? 'OVERHEATED! Cooling down...' : 'Bit Heat'}
                  </span>
                  <span className="text-white">{Math.round(drillHeat)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all ${
                      drillHeat > 78 ? 'bg-rose-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.round(drillHeat)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={drillJammed}
                onMouseDown={() => setDrilling(true)}
                onMouseUp={() => setDrilling(false)}
                onMouseLeave={() => setDrilling(false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  setDrilling(true);
                }}
                onTouchEnd={() => setDrilling(false)}
                className={`w-full rounded-xl py-3 text-sm font-bold transition-colors cursor-pointer select-none ${
                  drillJammed
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    : drilling
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-amber-600 text-white hover:bg-amber-500'
                }`}
              >
                {drillJammed
                  ? 'JAMMED · Wait to Cool (< 40%)'
                  : drilling
                  ? 'DRILLING VAULT...'
                  : 'HOLD TO DRILL VAULT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FiveM Scoreboard / Online Player List Modal (Z) */}
      {scoreboardOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-sky-400" />
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Dhaka City RP · Online Players ({1 + hud.remotePlayers.length})
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-hud-mono">
                    <span className={hud.mpConnected ? 'text-emerald-400' : 'text-amber-300'}>
                      {hud.mpConnected ? '● OneSync Connected' : '○ Connecting Server...'}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-sky-300">Ping {hud.mpPingMs}ms</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleScoreboard}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Close Scoreboard"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Editor + Passive Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 border-b border-slate-800 bg-slate-900/70 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdateProfile(editName, editTag);
                }}
                className="sm:col-span-8 flex items-center gap-1.5"
              >
                <input
                  type="text"
                  maxLength={18}
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value.toUpperCase())}
                  placeholder="TAG"
                  className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-hud-mono text-xs text-teal-300 placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                  title="Gang Tag"
                />
                <input
                  type="text"
                  maxLength={20}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="আপনার RP নাম..."
                  className="flex-1 min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md bg-teal-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-teal-500 cursor-pointer shrink-0"
                >
                  Save
                </button>
              </form>

              <button
                type="button"
                onClick={onTogglePassive}
                className={`sm:col-span-4 flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                  hud.passiveMode
                    ? 'border-sky-400 bg-sky-900/60 text-sky-100'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ShieldOff className="h-3.5 w-3.5 text-sky-400" />
                <span>{hud.passiveMode ? 'Passive: ON' : 'Passive: OFF'}</span>
              </button>
            </div>

            {/* Player Table */}
            <div className="max-h-72 overflow-y-auto p-3 space-y-1.5">
              <div className="grid grid-cols-12 px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="col-span-2">ID</span>
                <span className="col-span-4">Player / Gang</span>
                <span className="col-span-3">Job / Activity</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-1 text-right">Ping</span>
              </div>

              {/* Local Player Row */}
              <div className="grid grid-cols-12 items-center rounded-lg border border-teal-500/40 bg-teal-950/35 px-2.5 py-2 text-xs">
                <span className="col-span-2 font-hud-mono text-teal-300">
                  #{hud.mpPlayerId ?? 1}
                </span>
                <span className="col-span-4 font-semibold text-white truncate">
                  <span className="mr-1 text-teal-400 font-hud-mono">[{hud.mpGangTag}]</span>
                  {hud.mpPlayerName}
                  <span className="ml-1 text-[10px] text-teal-300">(আপনি)</span>
                </span>
                <span className="col-span-3 text-[11px] text-slate-300 truncate">
                  {hud.activeJob ? hud.activeJob.title : hud.inVehicle ? hud.vehicleName : 'Free Roam'}
                </span>
                <span className="col-span-2 text-center font-hud-mono text-[10px]">
                  {hud.passiveMode ? (
                    <span className="rounded bg-sky-900/70 px-1.5 py-0.5 text-sky-200">Passive</span>
                  ) : hud.wantedStars > 0 ? (
                    <span className="rounded bg-rose-900/70 px-1.5 py-0.5 text-rose-200">
                      ★{hud.wantedStars}
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-emerald-300">Active</span>
                  )}
                </span>
                <span className="col-span-1 text-right font-hud-mono text-[11px] text-emerald-400">
                  {hud.mpPingMs}
                </span>
              </div>

              {hud.remotePlayers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-3 py-4 text-center text-xs text-slate-400">
                  অন্য কোনো প্লেয়ার এই মুহূর্তে সার্ভারে যুক্ত হলে এখানে রিয়েল-টাইম দেখাবে (আরেকটি ট্যাবে গেম ওপেন করেও মাল্টিপ্লেয়ার টেস্ট করতে পারেন)।
                </div>
              ) : (
                hud.remotePlayers.map((rp) => (
                  <div
                    key={rp.id}
                    className="grid grid-cols-12 items-center rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-2 text-xs"
                  >
                    <span className="col-span-2 font-hud-mono text-slate-400">#{rp.id}</span>
                    <span className="col-span-4 font-semibold text-slate-100 truncate">
                      <span className="mr-1 text-sky-400 font-hud-mono">[{rp.gangTag}]</span>
                      {rp.name}
                    </span>
                    <span className="col-span-3 text-[11px] text-slate-300 truncate">
                      {rp.inVehicle ? rp.vehicleName || 'Driving' : rp.jobTitle}
                    </span>
                    <span className="col-span-2 text-center font-hud-mono text-[10px]">
                      {rp.passiveMode ? (
                        <span className="rounded bg-sky-900/70 px-1.5 py-0.5 text-sky-200">Passive</span>
                      ) : rp.wantedStars > 0 ? (
                        <span className="rounded bg-rose-900/70 px-1.5 py-0.5 text-rose-200">
                          ★{rp.wantedStars}
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">Active</span>
                      )}
                    </span>
                    <span className="col-span-1 text-right font-hud-mono text-[11px] text-slate-300">
                      {rp.pingMs}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabbed Server RP Chat (/me, /do, Global, Proximity) & Bengali NPC Role Chat Modal */}
      {chatOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-teal-400" />
                <div>
                  <div className="font-display text-sm font-bold text-white">
                    Dhaka RP Chat & Voice
                  </div>
                  <div className="text-[10px] text-teal-300">
                    {chatTab === 'server'
                      ? `${1 + hud.remotePlayers.length} Online · Global / Proximity 40m / /me /do`
                      : `${ROLE_CHAT_BANK.length}+ রোলপ্লে ডায়ালগ · বাংলা কণ্ঠ ও হাসি-কান্না`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {chatTab === 'npc' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onPlayEmotion('laugh', voiceIsFemale)}
                      className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-900/70 cursor-pointer"
                      title="হাসির শব্দ শুনুন ও NPC হাসা"
                    >
                      <Laugh className="h-3.5 w-3.5" />
                      <span>হাসি</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlayEmotion('cry', voiceIsFemale)}
                      className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-950/60 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-900/70 cursor-pointer"
                      title="কান্নার শব্দ শুনুন ও NPC কাঁদা"
                    >
                      <span>😢 কান্না</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onToggleChat}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                  aria-label="Close Chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Top Tabs: Server RP Chat vs NPC Role Chat */}
            <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-900/80 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChatTab('server')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 cursor-pointer ${
                  chatTab === 'server'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                <span>সার্ভার RP চ্যাট</span>
              </button>
              <button
                type="button"
                onClick={() => setChatTab('npc')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 cursor-pointer ${
                  chatTab === 'npc'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>বাংলা NPC চ্যাট (৬২৫+)</span>
              </button>
            </div>

            {chatTab === 'server' ? (
              <>
                <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-slate-900/60 px-3 py-2 text-[11px] font-semibold">
                  {(
                    [
                      { id: 'global', label: 'Global / OOC' },
                      { id: 'local', label: 'Local (40m)' },
                      { id: 'me', label: '/me Action' },
                      { id: 'do', label: '/do Context' },
                    ] as const
                  ).map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setServerChannel(ch.id)}
                      className={`rounded-md px-2.5 py-1 cursor-pointer transition-colors ${
                        serverChannel === ch.id
                          ? ch.id === 'me'
                            ? 'bg-purple-600 text-white'
                            : ch.id === 'do'
                            ? 'bg-amber-600 text-white'
                            : ch.id === 'local'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>

                <div
                  ref={serverChatScrollRef}
                  className="flex-1 space-y-2 overflow-y-auto bg-slate-950/90 p-3 min-h-[190px] max-h-64"
                >
                  {hud.mpChatFeed.length === 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300 leading-relaxed">
                      সার্ভার চ্যাটে লিখুন — <span className="text-purple-300 font-semibold">/me হাত তুলে সালাম দেয়</span>,{' '}
                      <span className="text-amber-300 font-semibold">/do পকেটে লাইসেন্স আছে</span>, বা{' '}
                      <span className="text-sky-300 font-semibold">/passive</span>।
                    </div>
                  )}
                  {hud.mpChatFeed.map((msg) => {
                    const badgeClass =
                      msg.channel === 'me'
                        ? 'bg-purple-900/70 text-purple-200 border-purple-500/40'
                        : msg.channel === 'do'
                        ? 'bg-amber-900/70 text-amber-200 border-amber-500/40'
                        : msg.channel === 'dispatch'
                        ? 'bg-rose-900/70 text-rose-200 border-rose-500/40'
                        : msg.channel === 'local'
                        ? 'bg-emerald-900/70 text-emerald-200 border-emerald-500/40'
                        : 'bg-sky-900/70 text-sky-200 border-sky-500/40';
                    return (
                      <div
                        key={msg.id}
                        className="rounded-lg border border-slate-800/90 bg-slate-900/80 px-3 py-2 text-xs leading-relaxed"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded border px-1.5 py-0.5 font-hud-mono uppercase ${badgeClass}`}>
                              {msg.channel === 'dispatch' ? '999' : msg.channel}
                            </span>
                            <span className="font-bold text-slate-100">
                              [{msg.gangTag}] {msg.senderName}
                            </span>
                          </div>
                          <span className="font-hud-mono text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          className={`mt-1 ${
                            msg.channel === 'me'
                              ? 'italic text-purple-200'
                              : msg.channel === 'do'
                              ? 'italic text-amber-200'
                              : msg.channel === 'dispatch'
                              ? 'font-semibold text-rose-200'
                              : 'text-slate-100'
                          }`}
                        >
                          {msg.channel === 'me' ? `* ${msg.senderName} ${msg.text}` : msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitServerChat();
                  }}
                  className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 p-2.5"
                >
                  <input
                    type="text"
                    value={serverChatInput}
                    onChange={(e) => setServerChatInput(e.target.value)}
                    placeholder="মেসেজ লিখুন বা /me, /do, /ooc, /passive..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!serverChatInput.trim()}
                    className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>পাঠান</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Role Selector + Male/Female Bangladeshi Voice Switch */}
                <div className="border-b border-slate-800 bg-slate-900/70 p-2 space-y-1.5">
                  <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(ROLE_META) as ChatRole[]).map((roleKey) => {
                      const active = selectedRole === roleKey;
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => {
                            setSelectedRole(roleKey);
                            setVoiceIsFemale(ROLE_META[roleKey].isFemaleVoice);
                          }}
                          className={`rounded-md px-2 py-1.5 text-[11px] font-semibold truncate cursor-pointer transition-colors ${
                            active
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {ROLE_META[roleKey].label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between px-1 text-[11px]">
                    <span className="text-slate-400">কণ্ঠস্বর (বাংলাদেশি টোন):</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setVoiceIsFemale(false)}
                        className={`rounded px-2 py-0.5 font-semibold cursor-pointer ${
                          !voiceIsFemale
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ছেলে কণ্ঠ
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoiceIsFemale(true)}
                        className={`rounded px-2 py-0.5 font-semibold cursor-pointer ${
                          voiceIsFemale
                            ? 'bg-pink-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        মেয়ে কণ্ঠ
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conversation History */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 space-y-2.5 overflow-y-auto bg-slate-950/90 p-3 min-h-[170px] max-h-60"
                >
                  {chatMessages.length === 0 && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300 leading-relaxed">
                      <span className="font-bold text-teal-300">{ROLE_META[selectedRole].speakerName}:</span>{' '}
                      আসসালামু আলাইকুম! আমাকে বাংলা বা বাংলিশে যেকোনো প্রশ্ন করুন — আমি সুন্দর বাংলা কণ্ঠে উত্তর দেবো।
                    </div>
                  )}

                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          msg.isUser
                            ? 'bg-teal-700 text-white'
                            : 'border border-slate-800 bg-slate-900 text-slate-100'
                        }`}
                      >
                        <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
                          <span className={msg.isUser ? 'text-teal-100 font-semibold' : 'text-amber-300 font-bold'}>
                            {msg.sender}
                          </span>
                          {!msg.isUser && (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300">
                                {msg.emotion === 'laugh'
                                  ? '😄 হাসি'
                                  : msg.emotion === 'cry'
                                  ? '😢 কান্না'
                                  : msg.emotion === 'happy'
                                  ? '😊 খুশি'
                                  : msg.emotion === 'angry'
                                  ? '😠 রাগী'
                                  : '💬 কথা'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onReplayVoice(msg.text, msg.isFemaleVoice, msg.emotion, msg.role)
                                }
                                className="flex items-center gap-0.5 text-teal-300 hover:text-teal-200 cursor-pointer"
                                title="আবার শুনুন"
                              >
                                <Volume2 className="h-3 w-3" />
                                <span>শুনুন</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div>{msg.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Role Questions */}
                <div className="flex flex-wrap gap-1.5 border-t border-slate-800 bg-slate-900/50 px-3 py-2">
                  {ROLE_META[selectedRole].quickQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => submitRoleQuestion(q)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-teal-500/60 hover:bg-slate-800 cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Question Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitRoleQuestion(chatInput);
                  }}
                  className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 p-2.5"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`${ROLE_META[selectedRole].speakerName}-কে বাংলায় প্রশ্ন লিখুন...`}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>পাঠান</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-lg border border-slate-700/70 bg-slate-950/85 px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600/25 border border-emerald-400/50 text-xs font-bold text-emerald-300 font-display">
              BD
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2 font-display text-sm font-bold tracking-wide text-white">
                <span>Dhaka City RP</span>
                {hud.passiveMode && (
                  <span className="rounded bg-sky-900/80 border border-sky-400/50 px-1.5 py-0.5 font-hud-mono text-[9px] text-sky-200">
                    PASSIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-hud-mono text-[11px] text-slate-400">
                <span>{hud.streetName} · {hud.gameTimeStr}</span>
                <span className="text-slate-600">·</span>
                <span className={`inline-flex items-center gap-1 ${hud.mpConnected ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {hud.mpConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {1 + hud.remotePlayers.length} Online ({hud.mpPingMs}ms)
                </span>
              </div>
            </div>
          </div>

          {hud.heist.stage !== 'idle' && hud.heist.stage !== 'ready_finale' && (
            <div className="max-w-xs rounded-md border border-rose-500/60 bg-slate-950/92 px-3 py-2 text-xs text-slate-100 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold text-rose-300">
                  <Lock className="h-3.5 w-3.5" />
                  {hud.heist.stage === 'finale_escape'
                    ? 'Bank Heist Getaway (৳200k)'
                    : hud.heist.stage === 'setup_hack_van'
                    ? 'Heist Setup 1'
                    : hud.heist.stage === 'setup_kuruma'
                    ? 'Heist Setup 2'
                    : 'Dhaka Bank Heist'}
                </span>
                <div className="flex items-center gap-2">
                  {(hud.heist.stage === 'setup_hack_van' ||
                    hud.heist.stage === 'setup_kuruma' ||
                    hud.heist.stage === 'finale_approach' ||
                    hud.heist.stage === 'finale_escape') && (
                    <span className="font-hud-mono text-[11px] text-emerald-400">
                      {Math.round(
                        Math.hypot(hud.heist.targetX - hud.playerX, hud.heist.targetZ - hud.playerZ)
                      )}
                      m
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={onCancelHeistMission}
                    className="text-slate-400 hover:text-rose-300 cursor-pointer"
                    aria-label="Cancel Heist"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-300">{hud.heist.targetName}</div>
            </div>
          )}

          {hud.activeJob && (
            <div className="max-w-xs rounded-md border border-amber-400/50 bg-slate-950/92 px-3 py-2 text-xs text-slate-100 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Briefcase className="h-3.5 w-3.5" />
                  {hud.activeJob.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-hud-mono text-[11px] text-emerald-400">
                    {Math.round(
                      Math.hypot(hud.activeJob.targetX - hud.playerX, hud.activeJob.targetZ - hud.playerZ)
                    )}
                    m
                  </span>
                  <button
                    type="button"
                    onClick={onCancelJob}
                    className="text-slate-400 hover:text-rose-300 cursor-pointer"
                    aria-label="Cancel Job"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-300">{hud.activeJob.targetName}</div>
              {hud.activeJob.stage === 'stabilize' && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${Math.round(hud.activeJob.progress)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {hud.activeTurf && (
            <div className="max-w-xs rounded-md border border-slate-700 bg-slate-950/92 px-3 py-1.5 text-xs shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Flag
                    className={`h-3.5 w-3.5 ${
                      hud.activeTurf.owner === 'TG' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  />
                  {hud.activeTurf.name}
                </span>
                <span
                  className={`font-hud-mono text-[10px] font-bold ${
                    hud.activeTurf.owner === 'TG' ? 'text-emerald-400' : 'text-rose-300'
                  }`}
                >
                  {hud.activeTurf.owner === 'TG' ? 'TG OWNED' : `${hud.activeTurf.progress}%`}
                </span>
              </div>
              {hud.activeTurf.owner === 'RIVAL' && (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${hud.activeTurf.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {hud.gpsTarget && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-cyan-500/40 bg-slate-950/90 px-3 py-1.5 text-xs text-cyan-200">
              <span className="flex items-center gap-1.5 font-medium">
                <Navigation className="h-3.5 w-3.5 text-cyan-400" />
                {hud.gpsTarget.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-hud-mono text-[11px] text-cyan-300">{gpsDistMeters}m</span>
                <button
                  type="button"
                  onClick={() => onSelectGps(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Clear GPS"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {hud.statusBanner && (
            <div className="max-w-xs rounded-md border border-amber-500/50 bg-slate-950/92 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-lg">
              {hud.statusBanner}
            </div>
          )}

          {!chatOpen && hud.mpChatFeed.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setChatTab('server');
                onToggleChat();
              }}
              className="hidden sm:flex max-w-xs flex-col gap-1 rounded-md border border-slate-700/70 bg-slate-950/80 px-2.5 py-1.5 text-left hover:bg-slate-900/90 cursor-pointer"
              title="Open Server RP Chat (T)"
            >
              {hud.mpChatFeed.slice(-3).map((msg) => (
                <div key={msg.id} className="truncate text-[10.5px] leading-tight">
                  <span
                    className={`mr-1 font-hud-mono uppercase ${
                      msg.channel === 'me'
                        ? 'text-purple-300'
                        : msg.channel === 'do'
                        ? 'text-amber-300'
                        : msg.channel === 'dispatch'
                        ? 'text-rose-400'
                        : msg.channel === 'local'
                        ? 'text-emerald-300'
                        : 'text-sky-300'
                    }`}
                  >
                    [{msg.channel === 'dispatch' ? '999' : msg.channel}]
                  </span>
                  <span className="font-semibold text-slate-200">{msg.senderName}: </span>
                  <span className={msg.channel === 'me' || msg.channel === 'do' ? 'italic text-slate-300' : 'text-slate-300'}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {hud.wantedStars > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-slate-950/92 px-2.5 py-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3.5 w-3.5 ${
                    s <= hud.wantedStars
                      ? hud.evadingPolice
                        ? 'fill-sky-400 text-sky-400'
                        : 'fill-amber-400 text-amber-400'
                      : 'text-slate-600'
                  }`}
                />
              ))}
              {hud.evadingPolice && (
                <span className="text-[10px] font-semibold text-sky-300 ml-1">Evading</span>
              )}
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/85 px-3 py-1.5">
            <button
              type="button"
              onClick={onToggleWeaponWheel}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-100 hover:text-teal-300 cursor-pointer"
            >
              <Crosshair className="h-3.5 w-3.5 text-teal-400" />
              <span>{hud.weaponName}</span>
            </button>
            {hud.equippedWeapon !== 'fists' && (
              <>
                <span className="font-hud-mono text-xs text-amber-300">
                  {hud.reloading ? 'Reloading...' : `${hud.ammoInMag}/${hud.ammoReserve}`}
                </span>
                <button
                  type="button"
                  onClick={onReload}
                  className="rounded bg-slate-800 p-1 text-slate-300 hover:text-white cursor-pointer"
                  title="Reload (R)"
                >
                  <RotateCw className="h-3 w-3" />
                </button>
              </>
            )}
          </div>

          <div className="hidden sm:block rounded-lg border border-slate-700/70 bg-slate-950/85 px-3 py-2 text-right">
            <div className="font-hud-mono text-xs font-semibold text-emerald-400">
              ৳{hud.cash.toLocaleString()} <span className="text-slate-500">/</span>{' '}
              <span className="text-sky-400">৳{hud.bank.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 space-y-0.5 text-[10px] font-hud-mono tracking-wide text-slate-300">
              {crew.map((m) => (
                <div key={m.id} className="flex items-center justify-end gap-1.5">
                  <span className={m.role === 'BOSS' ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                    {m.name}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-teal-400">{m.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center RP & GTA 5/6 Voice Subtitles / Police Dispatch Scanner Overlays */}
      <div className="flex flex-col items-center gap-2 self-center mb-14 sm:mb-4">
        {hud.policeDispatchBanner && (
          <div className="pointer-events-none flex max-w-md items-center gap-2 rounded-lg border border-sky-400/55 bg-slate-950/92 px-3.5 py-2 text-xs shadow-xl">
            <Radio className="h-4 w-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-hud-mono text-[9.5px] font-bold uppercase tracking-wider text-sky-300">
                DMP 999 Radio Dispatch
              </div>
              <div className="text-slate-100 leading-snug">{hud.policeDispatchBanner}</div>
            </div>
          </div>
        )}

        {hud.bustedProgress > 0 && hud.lifeState === 'alive' && (
          <div className="pointer-events-none w-64 rounded-lg border border-rose-500/70 bg-slate-950/95 px-3 py-2 shadow-xl">
            <div className="flex items-center justify-between font-hud-mono text-[11px] font-bold text-rose-300">
              <span>POLICE SURROUNDING!</span>
              <span>{hud.bustedProgress}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-rose-500 transition-all"
                style={{ width: `${hud.bustedProgress}%` }}
              />
            </div>
          </div>
        )}

        {hud.ambientSpeech && hud.lifeState === 'alive' && (
          <div
            className={`pointer-events-none max-w-md rounded-lg border px-3.5 py-1.5 text-xs shadow-xl ${
              hud.ambientSpeech.tone === 'dispatch'
                ? 'border-sky-500/50 bg-slate-950/92 text-sky-100'
                : hud.ambientSpeech.tone === 'angry'
                ? 'border-rose-500/50 bg-slate-950/92 text-rose-100'
                : hud.ambientSpeech.tone === 'panic'
                ? 'border-amber-500/50 bg-slate-950/92 text-amber-100'
                : 'border-slate-700 bg-slate-950/92 text-slate-100'
            }`}
          >
            <span className="font-bold text-amber-300">{hud.ambientSpeech.speaker}:</span>{' '}
            <span>&ldquo;{hud.ambientSpeech.text}&rdquo;</span>
          </div>
        )}

        {hud.activeRobberyName && (
          <div className="pointer-events-auto w-72 rounded-lg border border-amber-500/60 bg-slate-950/95 p-3 shadow-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
              <span className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-amber-400" />
                Robbing {hud.activeRobberyName}
              </span>
              <span className="font-hud-mono">{hud.robberyProgress}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${hud.robberyProgress}%` }}
              />
            </div>
            {hud.hasHostage && (
              <div className="mt-1.5 text-[10px] text-teal-300">
                Hostage Bonus: +30% faster vault crack
              </div>
            )}
          </div>
        )}

        {hud.hasHostage && hud.hostageDialogue && (
          <div className="pointer-events-auto max-w-md rounded-lg border border-pink-500/50 bg-slate-950/92 px-3.5 py-2.5 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-pink-300">
                Hostage · {hud.hostageName}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onCycleHostageDialogue}
                  className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  <MessageSquareQuote className="h-3 w-3" />
                  Talk
                </button>
                <button
                  type="button"
                  onClick={onToggleHostage}
                  className="rounded bg-pink-700 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-pink-600 cursor-pointer"
                >
                  {hud.wantedStars > 0 ? 'Negotiate Release (G)' : 'Release (G)'}
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-100 leading-relaxed">
              &ldquo;{hud.hostageDialogue}&rdquo;
            </p>
          </div>
        )}

        {hud.nearbyPrompt && (
          <button
            type="button"
            onClick={handlePrimaryPromptClick}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-teal-400/50 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-teal-200 shadow-lg hover:bg-slate-900 cursor-pointer"
          >
            {hud.nearCustomsBay && hud.inVehicle ? (
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
            ) : hud.nearServiceNpc ? (
              <Stethoscope className="h-4 w-4 text-cyan-400" />
            ) : hud.nearRobberyName ? (
              <Banknote className="h-4 w-4 text-amber-400" />
            ) : hud.nearProperty ? (
              <Home className="h-4 w-4 text-indigo-400" />
            ) : hud.nearVehicleName ? (
              <CarFront className="h-4 w-4 text-teal-400" />
            ) : (
              <Hand className="h-4 w-4 text-pink-400" />
            )}
            <span>{hud.nearbyPrompt}</span>
          </button>
        )}
      </div>

      {/* Bottom Row */}
      <div className="flex items-end justify-between gap-3">
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <div
            className={`relative overflow-hidden rounded-lg border-2 bg-slate-950 shadow-xl transition-colors ${
              hud.wantedStars > 0
                ? wantedBorderBlue
                  ? 'border-sky-400'
                  : 'border-rose-500'
                : 'border-slate-600/80'
            }`}
          >
            <canvas
              ref={radarCanvasRef}
              width={156}
              height={112}
              className="block h-[92px] w-[132px] sm:h-[112px] sm:w-[156px]"
            />
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/95 px-2 py-1 text-[10px]">
              <span className="font-semibold text-slate-100 truncate max-w-[90px]">
                {hud.streetName}
              </span>
              <span className="font-hud-mono text-teal-400">{hud.postalCode}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <StatusCircle value={hud.health} color="#22c55e" icon={<Heart className="h-3.5 w-3.5" />} label="Health" />
            <StatusCircle value={hud.armor} color="#38bdf8" icon={<Shield className="h-3.5 w-3.5" />} label="Armor" />
            <StatusCircle value={hud.hunger} color="#f59e0b" icon={<Utensils className="h-3.5 w-3.5" />} label="Hunger" />
            <StatusCircle value={hud.thirst} color="#06b6d4" icon={<Droplets className="h-3.5 w-3.5" />} label="Thirst" />
            <StatusCircle value={hud.stamina} color="#eab308" icon={<Zap className="h-3.5 w-3.5" />} label="Stamina" />
            <StatusCircle value={hud.voiceActive ? 100 : 35} color="#e2e8f0" icon={<Mic className="h-3.5 w-3.5" />} label="Voice" />
          </div>
        </div>

        <div className="pointer-events-auto hidden md:flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/90 px-2.5 py-1.5 shadow-xl">
            <button
              type="button"
              onClick={onToggleVehicle}
              disabled={!hud.inVehicle && !hud.nearVehicleName}
              className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              <CarFront className="h-3.5 w-3.5 text-teal-400" />
              <span>{hud.inVehicle ? 'Exit (F)' : 'Drive (F)'}</span>
            </button>

            <button
              type="button"
              onClick={onInteractService}
              disabled={!hud.nearServiceNpc}
              className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              <Stethoscope className="h-3.5 w-3.5 text-cyan-400" />
              <span>Talk (B)</span>
            </button>

            <button
              type="button"
              onClick={onToggleHostage}
              disabled={!hud.hasHostage && !hud.canTakeHostage}
              className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              <Hand className="h-3.5 w-3.5 text-pink-400" />
              <span>{hud.hasHostage ? 'Release (G)' : 'Hostage (G)'}</span>
            </button>

            <button
              type="button"
              onClick={onStartRobbery}
              disabled={!hud.nearRobberyName}
              className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              <Banknote className="h-3.5 w-3.5 text-amber-400" />
              <span>Rob (V)</span>
            </button>

            <button
              type="button"
              onClick={onToggleChat}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                chatOpen
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5 text-teal-300" />
              <span>RP চ্যাট (T)</span>
            </button>

            <button
              type="button"
              onClick={onToggleScoreboard}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                scoreboardOpen
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-sky-300" />
              <span>Players (Z)</span>
            </button>

            <button
              type="button"
              onClick={onTogglePassive}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                hud.passiveMode
                  ? 'bg-sky-800 text-sky-100 border border-sky-400/60'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title="Toggle GTA Online Passive Mode"
            >
              <ShieldOff className="h-3.5 w-3.5 text-sky-300" />
              <span>{hud.passiveMode ? 'Passive ON' : 'Passive'}</span>
            </button>

            <button
              type="button"
              onClick={onTogglePhone}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                phoneOpen
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 text-cyan-300" />
              <span>Phone (P)</span>
            </button>

            <button
              type="button"
              onClick={onToggleInventory}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                inventoryOpen
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Backpack className="h-3.5 w-3.5 text-emerald-300" />
              <span>Bag (I)</span>
            </button>

            <button
              type="button"
              onClick={onToggleWeaponWheel}
              className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Crosshair className="h-3.5 w-3.5 text-amber-400" />
              <span>Weapons</span>
            </button>

            <button
              type="button"
              onClick={onToggleCustoms}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                customsOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title="Dhaka Customs Tuning (U)"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-300" />
              <span>Tune (U)</span>
            </button>

            <button
              type="button"
              onClick={onToggleHeist}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                heistOpen
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title="Dhaka Bank Heist Planning Board (K)"
            >
              <Lock className="h-3.5 w-3.5 text-rose-300" />
              <span>Heist (K)</span>
            </button>

            {hud.inVehicle && (
              <>
                <button
                  type="button"
                  onClick={onCycleRadio}
                  className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Cycle Car Radio (N)"
                >
                  <Disc3 className={`h-3.5 w-3.5 ${radioMeta.accent}`} />
                  <span className={radioMeta.accent}>{radioMeta.name} (N)</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleHeadlights}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    hud.headlightsOn
                      ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Lights</span>
                </button>
                <button
                  type="button"
                  onClick={onHonk}
                  className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Horn
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onSwitchProtagonist()}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                hud.protagonist === 'nadia'
                  ? 'bg-pink-700/80 text-pink-100 border border-pink-400/50'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
              title="Switch Dual Protagonist: BOSS Sadik / Nadia (C)"
            >
              <Users className="h-3.5 w-3.5 text-amber-300" />
              <span>{hud.protagonist === 'nadia' ? 'Nadia (C)' : 'Sadik (C)'}</span>
            </button>

            <div className="mx-0.5 h-4 w-px bg-slate-700" />

            <div className="flex items-center rounded-md bg-slate-900 p-0.5 border border-slate-800">
              {(
                [
                  { id: 'day', icon: <Sun className="h-3.5 w-3.5" />, label: 'Day' },
                  { id: 'sunset', icon: <Sunset className="h-3.5 w-3.5" />, label: 'Sunset' },
                  { id: 'night', icon: <Moon className="h-3.5 w-3.5" />, label: 'Night' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTime(t.id)}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    hud.timePreset === t.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              className="rounded-md bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={onToggleTouch}
              className={`rounded-md p-1.5 cursor-pointer ${
                touchEnabled ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle On-Screen Touch Pad"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={onToggleHud}
              className="rounded-md bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700 cursor-pointer"
              title="Hide HUD"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-[11px] text-slate-300/80 bg-slate-950/75 px-2.5 py-0.5 rounded">
            WASD Move · Right-Click/Q Aim · N Radio · C Switch (Sadik/Nadia) · U Tune · K Heist · Z Players · T Chat · P Phone · F Drive
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex md:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSwitchProtagonist()}
              className={`rounded-md border p-2 ${
                hud.protagonist === 'nadia'
                  ? 'border-pink-400 bg-pink-700 text-white'
                  : 'border-slate-700 bg-slate-950/90 text-amber-300'
              }`}
              aria-label="Switch Protagonist"
            >
              <Users className="h-4 w-4" />
            </button>
            {hud.inVehicle && (
              <button
                type="button"
                onClick={onCycleRadio}
                className="rounded-md border border-slate-700 bg-slate-950/90 p-2 text-emerald-300"
                aria-label="Cycle Car Radio"
              >
                <Disc3 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCustoms}
              className={`rounded-md border p-2 ${
                customsOpen
                  ? 'border-cyan-400 bg-cyan-700 text-white'
                  : 'border-slate-700 bg-slate-950/90 text-cyan-300'
              }`}
              aria-label="Dhaka Customs"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleHeist}
              className={`rounded-md border p-2 ${
                heistOpen
                  ? 'border-rose-400 bg-rose-700 text-white'
                  : 'border-slate-700 bg-slate-950/90 text-rose-300'
              }`}
              aria-label="Heist Board"
            >
              <Lock className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleScoreboard}
              className={`rounded-md border p-2 ${
                scoreboardOpen
                  ? 'border-sky-400 bg-sky-700 text-white'
                  : 'border-slate-700 bg-slate-950/90 text-sky-300'
              }`}
              aria-label="Players"
            >
              <Users className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePassive}
              className={`rounded-md border p-2 ${
                hud.passiveMode
                  ? 'border-sky-400 bg-sky-800 text-white'
                  : 'border-slate-700 bg-slate-950/90 text-slate-300'
              }`}
              aria-label="Passive Mode"
            >
              <ShieldOff className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleChat}
              className="rounded-md border border-slate-700 bg-slate-950/90 p-2 text-teal-300"
              aria-label="বাংলা ও RP চ্যাট"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onTogglePhone}
              className="rounded-md border border-slate-700 bg-slate-950/90 p-2 text-cyan-300"
              aria-label="Phone"
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleInventory}
              className="rounded-md border border-slate-700 bg-slate-950/90 p-2 text-emerald-300"
              aria-label="Bag"
            >
              <Backpack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectTime(
                  hud.timePreset === 'day' ? 'sunset' : hud.timePreset === 'sunset' ? 'night' : 'day'
                )
              }
              className="rounded-md border border-slate-700 bg-slate-950/90 p-2 text-slate-200"
              aria-label="Cycle Time"
            >
              {hud.timePreset === 'day' ? (
                <Sun className="h-4 w-4 text-amber-300" />
              ) : hud.timePreset === 'sunset' ? (
                <Sunset className="h-4 w-4 text-orange-400" />
              ) : (
                <Moon className="h-4 w-4 text-sky-300" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="rounded-md border border-slate-700 bg-slate-950/90 p-2 text-slate-200"
              aria-label="Toggle Sound"
            >
              {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <PWAInstallButton />
          </div>

          {hud.inVehicle && (
            <div className="w-48 rounded-lg border border-slate-700/80 bg-slate-950/90 px-3.5 py-2 text-right shadow-xl">
              <div className="font-display text-2xl font-bold leading-none text-white font-hud-mono">
                {hud.speedKmh}{' '}
                <span className="text-xs font-medium text-teal-400">KM/H</span>
              </div>
              <div className="mt-1 text-[11px] font-medium text-slate-300 truncate">
                {hud.vehicleName}
              </div>
              <button
                type="button"
                onClick={onCycleRadio}
                className="mt-1 flex w-full items-center justify-end gap-1 text-[10px] font-hud-mono hover:underline cursor-pointer"
              >
                <Disc3 className={`h-3 w-3 ${radioMeta.accent}`} />
                <span className={radioMeta.accent}>
                  {radioMeta.freq !== '--' ? `${radioMeta.freq} FM · ` : ''}
                  {radioMeta.name}
                </span>
              </button>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px] font-hud-mono">
                <div>
                  <div className="text-slate-400">HP {hud.vehicleHealth}%</div>
                  <div className="mt-0.5 h-1 rounded bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${hud.vehicleHealth}%` }} />
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">FUEL {hud.vehicleFuel}%</div>
                  <div className="mt-0.5 h-1 rounded bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${hud.vehicleFuel}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
