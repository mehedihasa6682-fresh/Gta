import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  Banknote,
  CarFront,
  Crosshair,
  Flame,
  Hand,
  Stethoscope,
  Zap,
} from 'lucide-react';

interface TouchControlsProps {
  inVehicle: boolean;
  canEnterVehicle: boolean;
  canTakeHostage: boolean;
  hasHostage: boolean;
  canRob: boolean;
  canInteractService: boolean;
  onMoveChange: (x: number, y: number) => void;
  onSprintChange: (sprinting: boolean) => void;
  onJumpChange: (jumping: boolean) => void;
  onHandbrakeChange: (braking: boolean) => void;
  onFireChange: (firing: boolean) => void;
  onToggleVehicle: () => void;
  onToggleHostage: () => void;
  onStartRobbery: () => void;
  onInteractService: () => void;
  onToggleWeaponWheel: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  inVehicle,
  canEnterVehicle,
  canTakeHostage,
  hasHostage,
  canRob,
  canInteractService,
  onMoveChange,
  onSprintChange,
  onJumpChange,
  onHandbrakeChange,
  onFireChange,
  onToggleVehicle,
  onToggleHostage,
  onStartRobbery,
  onInteractService,
  onToggleWeaponWheel,
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const maxRadius = 38;

  const updateStick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    onMoveChange(dx / maxRadius, -dy / maxRadius);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onMoveChange(0, 0);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex items-end justify-between px-4 sm:px-6">
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          activePointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          resetStick();
        }}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-500/50 bg-slate-950/65 touch-none"
      >
        <div className="h-14 w-14 rounded-full border border-slate-600/40" />
        <div
          className="absolute h-11 w-11 rounded-full bg-slate-200/85 shadow-md"
          style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
        />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {canInteractService && !inVehicle && (
          <button
            type="button"
            onClick={onInteractService}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/60 bg-cyan-700/90 px-3 text-xs font-semibold text-white active:scale-95"
          >
            <Stethoscope className="h-4 w-4" />
            <span>Talk</span>
          </button>
        )}

        {canRob && !inVehicle && (
          <button
            type="button"
            onClick={onStartRobbery}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-600/90 px-3 text-xs font-semibold text-white active:scale-95"
          >
            <Banknote className="h-4 w-4" />
            <span>Rob</span>
          </button>
        )}

        {(canTakeHostage || hasHostage) && !inVehicle && (
          <button
            type="button"
            onClick={onToggleHostage}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-pink-400/60 bg-pink-700/90 px-3 text-xs font-semibold text-white active:scale-95"
          >
            <Hand className="h-4 w-4" />
            <span>{hasHostage ? 'Release' : 'Hostage'}</span>
          </button>
        )}

        {(inVehicle || canEnterVehicle) && (
          <button
            type="button"
            onClick={onToggleVehicle}
            className="flex h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl border border-teal-400/50 bg-teal-700/85 px-3 text-xs font-semibold text-white active:scale-95"
          >
            <CarFront className="h-4 w-4" />
            <span>{inVehicle ? 'Exit' : 'Drive'}</span>
          </button>
        )}

        {inVehicle ? (
          <button
            type="button"
            onPointerDown={() => onHandbrakeChange(true)}
            onPointerUp={() => onHandbrakeChange(false)}
            onPointerLeave={() => onHandbrakeChange(false)}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-red-400/50 bg-red-900/80 text-[11px] font-semibold text-red-100 active:scale-95"
          >
            <span>BRAKE</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleWeaponWheel}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-500/50 bg-slate-900/80 text-teal-300 active:scale-95"
              aria-label="Weapons"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button
              type="button"
              onPointerDown={() => onSprintChange(true)}
              onPointerUp={() => onSprintChange(false)}
              onPointerLeave={() => onSprintChange(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-500/50 bg-slate-900/80 text-amber-300 active:scale-95"
              aria-label="Sprint"
            >
              <Zap className="h-4 w-4" />
            </button>
            <button
              type="button"
              onPointerDown={() => onJumpChange(true)}
              onPointerUp={() => onJumpChange(false)}
              onPointerLeave={() => onJumpChange(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-400/50 bg-slate-900/85 text-white active:scale-95"
              aria-label="Jump"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onPointerDown={() => onFireChange(true)}
              onPointerUp={() => onFireChange(false)}
              onPointerLeave={() => onFireChange(false)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/60 bg-rose-700/85 text-white active:scale-95"
              aria-label="Fire"
            >
              <Flame className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
