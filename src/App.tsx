import { useCallback, useEffect, useRef, useState } from 'react';
import { FiveMHud } from './components/FiveMHud';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TouchControls } from './components/TouchControls';
import { GameEngine } from './game/GameEngine';
import { ChatEmotion, ChatRole } from './game/roleChats';
import {
  GangMember,
  GpsTarget,
  HUDState,
  InventoryItemId,
  JobKind,
  MinimapBuilding,
  MinimapRoad,
  MpChatChannel,
  PlayerOutfitId,
  ProtagonistId,
  TimePreset,
  VehicleUpgradeState,
  WeaponId,
} from './game/types';
import { GPS_LOCATIONS, INITIAL_PROPERTIES } from './game/world';

const CREW_ROSTER: GangMember[] = [
  { id: '1', name: 'BOSS Sadik', tag: 'TG', role: 'BOSS' },
  { id: '2', name: 'BROWNYY', tag: 'TG', role: 'MEMBER' },
  { id: '3', name: 'MR ACID', tag: 'TG', role: 'MEMBER' },
  { id: '4', name: 'MOON RAZOR', tag: 'TG', role: 'MEMBER' },
  { id: '5', name: 'INF3RNO XD', tag: 'TG', role: 'MEMBER' },
  { id: '6', name: 'DIPJOL_KAKU', tag: 'TG', role: 'MEMBER' },
];

const INITIAL_HUD: HUDState = {
  health: 100,
  armor: 85,
  hunger: 92,
  thirst: 88,
  stamina: 100,
  voiceActive: false,
  cash: 14250,
  bank: 185400,
  speedKmh: 0,
  inVehicle: false,
  vehicleName: '',
  vehicleId: null,
  vehicleHealth: 100,
  vehicleFuel: 100,
  vehicleUpgrades: null,
  nearCustomsBay: false,
  headlightsOn: false,
  nearVehicleName: null,
  streetName: 'Gulshan Ave',
  postalCode: '1212',
  gameTimeStr: '12:24 PM',
  timePreset: 'day',
  playerX: 2.4,
  playerZ: 7.2,
  playerHeading: 0,
  wantedStars: 0,
  evadingPolice: false,
  nearbyPrompt: null,
  canTakeHostage: false,
  hasHostage: false,
  hostageName: null,
  hostageDialogue: null,
  nearRobberyName: null,
  activeRobberyName: null,
  robberyProgress: 0,
  nearServiceNpc: null,
  nearProperty: null,
  properties: INITIAL_PROPERTIES,
  spawnPropertyId: null,
  equippedOutfit: 'tg_boss',
  heist: {
    stage: 'idle',
    setup1Done: false,
    setup2Done: false,
    targetName: 'Dhaka Bank Vault',
    targetX: 15.2,
    targetZ: -38,
    potentialPayout: 200000,
    completedHeists: 0,
  },
  gpsTarget: null,
  inventory: [],
  activeJob: null,
  activeTurf: null,
  turfZones: [],
  completedJobs: 0,
  gangRep: 120,
  statusBanner: null,
  equippedWeapon: 'fists',
  weaponName: 'Fists (Melee)',
  ammoInMag: 0,
  ammoReserve: 0,
  reloading: false,
  aiming: false,
  hitMarker: false,
  radioStation: 'off',
  protagonist: 'sadik',
  switchingCharacter: false,
  lifeState: 'alive',
  lifeMessage: null,
  bustedProgress: 0,
  policeDispatchBanner: null,
  ambientSpeech: null,
  socialFeed: [],
  vehicles: [],
  npcs: [],
  robberySpots: [],
  mpConnected: false,
  mpPlayerId: null,
  mpPlayerName: 'BOSS Sadik',
  mpGangTag: 'TG',
  mpPingMs: 24,
  passiveMode: false,
  remotePlayers: [],
  mpChatFeed: [],
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const rightMouseAimingRef = useRef(false);
  const dragPointerId = useRef<number | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedEnough = useRef(false);

  const [hud, setHud] = useState<HUDState>(INITIAL_HUD);
  const [worldData, setWorldData] = useState<{
    buildings: MinimapBuilding[];
    roads: MinimapRoad[];
  }>({ buildings: [], roads: [] });
  const [hudHidden, setHudHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [weaponWheelOpen, setWeaponWheelOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [customsOpen, setCustomsOpen] = useState(false);
  const [heistOpen, setHeistOpen] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState(() =>
    typeof window !== 'undefined'
      ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
      : false
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new GameEngine(
      container,
      (nextHud) => setHud(nextHud),
      (lost) => setContextLost(lost)
    );
    engineRef.current = engine;
    setWorldData(engine.getWorldData());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncKeyboardMovement = () => {
      const keys = keysPressed.current;
      let moveX = 0;
      let moveY = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) moveX += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) moveY += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) moveY -= 1;

      engineRef.current?.setInput({
        moveX,
        moveY,
        sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        jump: keys.has('Space'),
        handbrake: keys.has('Space'),
        firing: keys.has('KeyE'),
        aiming: keys.has('KeyQ') || rightMouseAimingRef.current,
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setPhoneOpen(false);
        setInventoryOpen(false);
        setWeaponWheelOpen(false);
        setChatOpen(false);
        setScoreboardOpen(false);
        setCustomsOpen(false);
        setHeistOpen(false);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        setPhoneOpen(false);
        setInventoryOpen(false);
        setChatOpen(false);
        setScoreboardOpen(false);
        setCustomsOpen(false);
        setHeistOpen(false);
        setWeaponWheelOpen((prev) => !prev);
        return;
      }
      if (e.repeat) return;
      engineRef.current?.unlockAudio();
      keysPressed.current.add(e.code);

      if (e.code === 'KeyF') engineRef.current?.toggleVehicle();
      else if (e.code === 'KeyB') engineRef.current?.interactServiceNpc();
      else if (e.code === 'KeyG') engineRef.current?.toggleHostage();
      else if (e.code === 'KeyV') engineRef.current?.startRobbery();
      else if (e.code === 'KeyL') engineRef.current?.toggleHeadlights();
      else if (e.code === 'KeyH') engineRef.current?.honk();
      else if (e.code === 'KeyR') engineRef.current?.reloadWeapon();
      else if (e.code === 'KeyN') engineRef.current?.cycleRadioStation();
      else if (e.code === 'KeyC') engineRef.current?.switchProtagonist();
      else if (e.code === 'KeyT') {
        e.preventDefault();
        setPhoneOpen(false);
        setInventoryOpen(false);
        setWeaponWheelOpen(false);
        setScoreboardOpen(false);
        setCustomsOpen(false);
        setHeistOpen(false);
        setChatOpen((prev) => !prev);
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        setPhoneOpen(false);
        setInventoryOpen(false);
        setWeaponWheelOpen(false);
        setChatOpen(false);
        setCustomsOpen(false);
        setHeistOpen(false);
        setScoreboardOpen((prev) => !prev);
      } else if (e.code === 'KeyU') {
        e.preventDefault();
        setPhoneOpen(false);
        setInventoryOpen(false);
        setWeaponWheelOpen(false);
        setChatOpen(false);
        setScoreboardOpen(false);
        setHeistOpen(false);
        setCustomsOpen((prev) => !prev);
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        setPhoneOpen(false);
        setInventoryOpen(false);
        setWeaponWheelOpen(false);
        setChatOpen(false);
        setScoreboardOpen(false);
        setCustomsOpen(false);
        setHeistOpen((prev) => !prev);
      } else if (e.code === 'KeyP') {
        setInventoryOpen(false);
        setWeaponWheelOpen(false);
        setChatOpen(false);
        setScoreboardOpen(false);
        setCustomsOpen(false);
        setHeistOpen(false);
        setPhoneOpen((prev) => !prev);
      } else if (e.code === 'KeyI') {
        setPhoneOpen(false);
        setWeaponWheelOpen(false);
        setChatOpen(false);
        setScoreboardOpen(false);
        setCustomsOpen(false);
        setHeistOpen(false);
        setInventoryOpen((prev) => !prev);
      } else if (e.code === 'KeyM') setHudHidden((prev) => !prev);
      else if (e.code === 'Digit1') engineRef.current?.selectWeapon('fists');
      else if (e.code === 'Digit2') engineRef.current?.selectWeapon('pistol');
      else if (e.code === 'Digit3') engineRef.current?.selectWeapon('smg');
      else if (e.code === 'Digit4') engineRef.current?.selectWeapon('shotgun');

      syncKeyboardMovement();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
      syncKeyboardMovement();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleToggleVehicle = useCallback(() => engineRef.current?.toggleVehicle(), []);
  const handleToggleHostage = useCallback(() => engineRef.current?.toggleHostage(), []);
  const handleCycleHostageDialogue = useCallback(() => engineRef.current?.cycleHostageDialogue(), []);
  const handleStartRobbery = useCallback(() => engineRef.current?.startRobbery(), []);
  const handleInteractService = useCallback(() => engineRef.current?.interactServiceNpc(), []);
  const handleToggleHeadlights = useCallback(() => engineRef.current?.toggleHeadlights(), []);
  const handleHonk = useCallback(() => engineRef.current?.honk(), []);
  const handleSelectTime = useCallback((p: TimePreset) => engineRef.current?.setTimePreset(p), []);
  const handleSelectWeapon = useCallback((w: WeaponId) => engineRef.current?.selectWeapon(w), []);
  const handleReload = useCallback(() => engineRef.current?.reloadWeapon(), []);
  const handleDepositCash = useCallback((amt: number) => engineRef.current?.depositCash(amt), []);
  const handleWithdrawCash = useCallback((amt: number) => engineRef.current?.withdrawCash(amt), []);
  const handleSelectGps = useCallback((target: GpsTarget | null) => engineRef.current?.setGpsTarget(target), []);
  const handleCallMechanic = useCallback(() => engineRef.current?.callMechanic(), []);
  const handleUseItem = useCallback((id: InventoryItemId) => engineRef.current?.useInventoryItem(id), []);
  const handleBuyItem = useCallback((id: InventoryItemId) => engineRef.current?.buyInventoryItem(id), []);
  const handleStartJob = useCallback((kind: JobKind) => engineRef.current?.startJob(kind), []);
  const handleCancelJob = useCallback(() => engineRef.current?.cancelJob(), []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleTogglePhone = useCallback(() => {
    setInventoryOpen(false);
    setWeaponWheelOpen(false);
    setChatOpen(false);
    setScoreboardOpen(false);
    setCustomsOpen(false);
    setHeistOpen(false);
    setPhoneOpen((prev) => !prev);
  }, []);

  const handleToggleInventory = useCallback(() => {
    setPhoneOpen(false);
    setWeaponWheelOpen(false);
    setChatOpen(false);
    setScoreboardOpen(false);
    setCustomsOpen(false);
    setHeistOpen(false);
    setInventoryOpen((prev) => !prev);
  }, []);

  const handleToggleWeaponWheel = useCallback(() => {
    setPhoneOpen(false);
    setInventoryOpen(false);
    setChatOpen(false);
    setScoreboardOpen(false);
    setCustomsOpen(false);
    setHeistOpen(false);
    setWeaponWheelOpen((prev) => !prev);
  }, []);

  const handleToggleChat = useCallback(() => {
    setPhoneOpen(false);
    setInventoryOpen(false);
    setWeaponWheelOpen(false);
    setScoreboardOpen(false);
    setCustomsOpen(false);
    setHeistOpen(false);
    setChatOpen((prev) => !prev);
  }, []);

  const handleToggleScoreboard = useCallback(() => {
    setPhoneOpen(false);
    setInventoryOpen(false);
    setWeaponWheelOpen(false);
    setChatOpen(false);
    setCustomsOpen(false);
    setHeistOpen(false);
    setScoreboardOpen((prev) => !prev);
  }, []);

  const handleToggleCustoms = useCallback(() => {
    setPhoneOpen(false);
    setInventoryOpen(false);
    setWeaponWheelOpen(false);
    setChatOpen(false);
    setScoreboardOpen(false);
    setHeistOpen(false);
    setCustomsOpen((prev) => !prev);
  }, []);

  const handleToggleHeist = useCallback(() => {
    setPhoneOpen(false);
    setInventoryOpen(false);
    setWeaponWheelOpen(false);
    setChatOpen(false);
    setScoreboardOpen(false);
    setCustomsOpen(false);
    setHeistOpen((prev) => !prev);
  }, []);

  const handleApplyVehicleUpgrade = useCallback(
    (partial: Partial<VehicleUpgradeState>, cost: number, repair = false) =>
      engineRef.current?.applyVehicleUpgrade(partial, cost, repair) ?? false,
    []
  );
  const handleBuyProperty = useCallback((id: string) => engineRef.current?.buyProperty(id), []);
  const handleSetSpawnProperty = useCallback(
    (id: string | null) => engineRef.current?.setSpawnProperty(id),
    []
  );
  const handleRestApartment = useCallback((id: string) => engineRef.current?.restAtApartment(id), []);
  const handleEquipOutfit = useCallback(
    (outfit: PlayerOutfitId) => engineRef.current?.equipOutfit(outfit),
    []
  );
  const handleSummonGarageVehicle = useCallback(
    (vehicleId: string) => engineRef.current?.summonGarageVehicle(vehicleId),
    []
  );
  const handleStartHeistSetup = useCallback(
    (step: 1 | 2) => engineRef.current?.startHeistSetup(step),
    []
  );
  const handleStartBankHeistFinale = useCallback(
    () => engineRef.current?.startBankHeistFinale(),
    []
  );
  const handleAdvanceHeistMinigame = useCallback(
    (nextStage: 'finale_drill' | 'finale_escape') =>
      engineRef.current?.advanceHeistMinigame(nextStage),
    []
  );
  const handlePlayHeistDrillTick = useCallback(
    (heatRatio: number) => engineRef.current?.playHeistDrillTick(heatRatio),
    []
  );
  const handleCancelHeistMission = useCallback(() => engineRef.current?.cancelHeistMission(), []);

  const handleSendServerChat = useCallback(
    (channel: MpChatChannel, text: string) => engineRef.current?.sendServerChat(channel, text),
    []
  );

  const handleUpdateProfile = useCallback(
    (name: string, gangTag: string) => engineRef.current?.updateProfile(name, gangTag),
    []
  );

  const handleTogglePassive = useCallback(() => engineRef.current?.togglePassiveMode(), []);

  const handleAskRoleChat = useCallback(
    (role: ChatRole, question: string, voiceFemaleOverride?: boolean) =>
      engineRef.current?.askRoleChat(role, question, voiceFemaleOverride),
    []
  );

  const handlePlayEmotion = useCallback(
    (emotion: 'laugh' | 'cry', isFemale: boolean) => engineRef.current?.playEmotionVoice(emotion, isFemale),
    []
  );

  const handleReplayVoice = useCallback(
    (text: string, isFemale: boolean, emotion: ChatEmotion, role?: ChatRole) =>
      engineRef.current?.speakLine(text, isFemale, emotion, role),
    []
  );

  const handleCycleRadio = useCallback(() => engineRef.current?.cycleRadioStation(), []);
  const handleSwitchProtagonist = useCallback(
    (id?: ProtagonistId) => engineRef.current?.switchProtagonist(id),
    []
  );

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#0b0f17]"
      onContextMenu={(e) => {
        if (e.target === mountRef.current?.firstChild || e.target === mountRef.current) {
          e.preventDefault();
        }
      }}
      onPointerDown={(e) => {
        engineRef.current?.unlockAudio();
        if (e.target === mountRef.current?.firstChild || e.target === mountRef.current) {
          if (e.button === 2) {
            rightMouseAimingRef.current = true;
            engineRef.current?.setInput({ aiming: true });
            return;
          }
          dragPointerId.current = e.pointerId;
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
          draggedEnough.current = false;
        }
      }}
      onPointerMove={(e) => {
        if (dragPointerId.current !== e.pointerId) return;
        const dx = e.clientX - lastPointerPos.current.x;
        const dy = e.clientY - lastPointerPos.current.y;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        if (Math.hypot(e.clientX - pointerDownPos.current.x, e.clientY - pointerDownPos.current.y) > 5) {
          draggedEnough.current = true;
        }
        engineRef.current?.addCameraOrbit(dx, dy);
      }}
      onPointerUp={(e) => {
        if (e.button === 2) {
          rightMouseAimingRef.current = false;
          engineRef.current?.setInput({ aiming: keysPressed.current.has('KeyQ') });
          return;
        }
        if (dragPointerId.current === e.pointerId) {
          if (
            !draggedEnough.current &&
            !touchEnabled &&
            !weaponWheelOpen &&
            !phoneOpen &&
            !inventoryOpen &&
            !chatOpen &&
            !scoreboardOpen &&
            !customsOpen &&
            !heistOpen &&
            hud.heist.stage !== 'finale_hack' &&
            hud.heist.stage !== 'finale_drill'
          ) {
            engineRef.current?.setInput({ firing: true });
            window.setTimeout(() => engineRef.current?.setInput({ firing: false }), 120);
          }
          dragPointerId.current = null;
        }
      }}
      onPointerCancel={() => {
        rightMouseAimingRef.current = false;
        engineRef.current?.setInput({ aiming: keysPressed.current.has('KeyQ') });
        dragPointerId.current = null;
      }}
    >
      <div ref={mountRef} className="h-full w-full" />

      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-display text-lg font-bold text-white">3D Graphics Paused</h2>
            <p className="mt-2 text-sm text-slate-300">
              WebGL context was interrupted by your device. Reloading the viewport restores Dhaka City.
            </p>
          </div>
        </div>
      )}

      <OfflineIndicator />

      <FiveMHud
        hud={hud}
        buildings={worldData.buildings}
        roads={worldData.roads}
        crew={CREW_ROSTER}
        gpsLocations={GPS_LOCATIONS}
        hudHidden={hudHidden}
        muted={muted}
        touchEnabled={touchEnabled}
        weaponWheelOpen={weaponWheelOpen}
        phoneOpen={phoneOpen}
        inventoryOpen={inventoryOpen}
        chatOpen={chatOpen}
        scoreboardOpen={scoreboardOpen}
        customsOpen={customsOpen}
        heistOpen={heistOpen}
        onToggleHud={() => setHudHidden((prev) => !prev)}
        onToggleVehicle={handleToggleVehicle}
        onToggleHostage={handleToggleHostage}
        onCycleHostageDialogue={handleCycleHostageDialogue}
        onStartRobbery={handleStartRobbery}
        onInteractService={handleInteractService}
        onToggleHeadlights={handleToggleHeadlights}
        onHonk={handleHonk}
        onSelectTime={handleSelectTime}
        onToggleMute={handleToggleMute}
        onToggleTouch={() => setTouchEnabled((prev) => !prev)}
        onToggleWeaponWheel={handleToggleWeaponWheel}
        onTogglePhone={handleTogglePhone}
        onToggleInventory={handleToggleInventory}
        onToggleChat={handleToggleChat}
        onToggleScoreboard={handleToggleScoreboard}
        onToggleCustoms={handleToggleCustoms}
        onToggleHeist={handleToggleHeist}
        onApplyVehicleUpgrade={handleApplyVehicleUpgrade}
        onBuyProperty={handleBuyProperty}
        onSetSpawnProperty={handleSetSpawnProperty}
        onRestApartment={handleRestApartment}
        onEquipOutfit={handleEquipOutfit}
        onSummonGarageVehicle={handleSummonGarageVehicle}
        onStartHeistSetup={handleStartHeistSetup}
        onStartBankHeistFinale={handleStartBankHeistFinale}
        onAdvanceHeistMinigame={handleAdvanceHeistMinigame}
        onPlayHeistDrillTick={handlePlayHeistDrillTick}
        onCancelHeistMission={handleCancelHeistMission}
        onSendServerChat={handleSendServerChat}
        onUpdateProfile={handleUpdateProfile}
        onTogglePassive={handleTogglePassive}
        onAskRoleChat={handleAskRoleChat}
        onPlayEmotion={handlePlayEmotion}
        onReplayVoice={handleReplayVoice}
        onSelectWeapon={handleSelectWeapon}
        onReload={handleReload}
        onDepositCash={handleDepositCash}
        onWithdrawCash={handleWithdrawCash}
        onSelectGps={handleSelectGps}
        onCallMechanic={handleCallMechanic}
        onUseItem={handleUseItem}
        onBuyItem={handleBuyItem}
        onStartJob={handleStartJob}
        onCancelJob={handleCancelJob}
        onCycleRadio={handleCycleRadio}
        onSwitchProtagonist={handleSwitchProtagonist}
      />

      {touchEnabled && !hudHidden && (
        <TouchControls
          inVehicle={hud.inVehicle}
          canEnterVehicle={!!hud.nearVehicleName}
          canTakeHostage={hud.canTakeHostage}
          hasHostage={hud.hasHostage}
          canRob={!!hud.nearRobberyName}
          canInteractService={!!hud.nearServiceNpc}
          onMoveChange={(x, y) => engineRef.current?.setInput({ moveX: x, moveY: y })}
          onSprintChange={(sprint) => engineRef.current?.setInput({ sprint })}
          onJumpChange={(jump) => engineRef.current?.setInput({ jump })}
          onHandbrakeChange={(handbrake) => engineRef.current?.setInput({ handbrake })}
          onFireChange={(firing) => engineRef.current?.setInput({ firing })}
          onToggleVehicle={handleToggleVehicle}
          onToggleHostage={handleToggleHostage}
          onStartRobbery={handleStartRobbery}
          onInteractService={handleInteractService}
          onToggleWeaponWheel={handleToggleWeaponWheel}
        />
      )}
    </div>
  );
}
