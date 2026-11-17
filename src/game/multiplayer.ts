import { MpChatChannel, MpChatMessage, RemotePlayerState, VehicleKind } from './types';

export interface MultiplayerCallbacks {
  onConnectionChange: (connected: boolean, selfId: number | null) => void;
  onPlayersChange: (players: RemotePlayerState[]) => void;
  onChatMessage: (message: MpChatMessage) => void;
  onChatHistory: (messages: MpChatMessage[]) => void;
  onTurfUpdated: (turfId: string, owner: 'TG' | 'RIVAL') => void;
  onPingUpdate: (pingMs: number) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private disposed = false;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private lastMoveSentAt = 0;
  private selfId: number | null = null;
  private players = new Map<number, RemotePlayerState>();
  private pingMs = 24;
  private reconnectDelayMs = 1500;
  private pendingProfile = {
    name: 'Sadik_BD',
    gangTag: 'TG',
    jobTitle: 'Citizen',
    x: 2.4,
    z: 7.2,
    heading: 0,
    passiveMode: false,
  };

  constructor(private readonly callbacks: MultiplayerCallbacks) {
    this.connect();
  }

  private connect(): void {
    if (this.disposed || typeof window === 'undefined') return;
    if (navigator.onLine === false) {
      this.scheduleReconnect();
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        if (this.disposed) {
          ws.close();
          return;
        }
        this.reconnectDelayMs = 1500;
        this.sendRaw({
          type: 'player:join',
          ...this.pendingProfile,
        });
        this.startHeartbeat();
      };

      ws.onmessage = (evt) => {
        if (this.disposed) return;
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(String(evt.data)) as Record<string, unknown>;
        } catch {
          return;
        }

        if (data.type === 'state:init') {
          this.selfId = typeof data.selfId === 'number' ? data.selfId : null;
          this.players.clear();
          const list = Array.isArray(data.players) ? (data.players as RemotePlayerState[]) : [];
          for (const p of list) {
            if (p.id !== this.selfId) {
              this.players.set(p.id, p);
            }
          }
          this.callbacks.onConnectionChange(true, this.selfId);
          this.emitPlayers();

          if (Array.isArray(data.chatHistory)) {
            this.callbacks.onChatHistory(data.chatHistory as MpChatMessage[]);
          }

          if (data.turfs && typeof data.turfs === 'object') {
            for (const [turfId, owner] of Object.entries(data.turfs as Record<string, 'TG' | 'RIVAL'>)) {
              this.callbacks.onTurfUpdated(turfId, owner);
            }
          }
          return;
        }

        if (data.type === 'player:joined') {
          const p = data.player as RemotePlayerState | undefined;
          if (!p || p.id === this.selfId || this.players.has(p.id)) return;
          this.players.set(p.id, p);
          this.emitPlayers();
          return;
        }

        if (data.type === 'player:moved') {
          const p = data.player as RemotePlayerState | undefined;
          if (!p || p.id === this.selfId) return;
          this.players.set(p.id, p);
          this.emitPlayers();
          return;
        }

        if (data.type === 'player:left') {
          const pid = typeof data.id === 'number' ? data.id : -1;
          if (this.players.delete(pid)) {
            this.emitPlayers();
          }
          return;
        }

        if (data.type === 'chat:message') {
          const msg = data.message as MpChatMessage | undefined;
          if (msg) this.callbacks.onChatMessage(msg);
          return;
        }

        if (data.type === 'turf:updated') {
          if (typeof data.turfId === 'string' && (data.owner === 'TG' || data.owner === 'RIVAL')) {
            this.callbacks.onTurfUpdated(data.turfId, data.owner);
          }
          return;
        }

        if (data.type === 'pong' && typeof data.ts === 'number') {
          this.pingMs = Math.max(1, Math.min(999, Math.round(performance.now() - data.ts)));
          this.callbacks.onPingUpdate(this.pingMs);
        }
      };

      ws.onclose = () => {
        this.stopHeartbeat();
        this.callbacks.onConnectionChange(false, this.selfId);
        if (!this.disposed) {
          this.scheduleReconnect();
        }
      };

      ws.onerror = () => {
        // onclose will handle cleanup and reconnect cleanly
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelayMs = Math.min(8000, this.reconnectDelayMs * 1.4);
      this.connect();
    }, this.reconnectDelayMs);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = window.setInterval(() => {
      this.sendRaw({ type: 'ping', ts: performance.now(), pingMs: this.pingMs });
    }, 4000);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private sendRaw(payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private emitPlayers(): void {
    this.callbacks.onPlayersChange(Array.from(this.players.values()));
  }

  public updateJoinProfile(
    name: string,
    gangTag: string,
    jobTitle: string,
    x: number,
    z: number,
    heading: number,
    passiveMode: boolean
  ): void {
    this.pendingProfile = { name, gangTag, jobTitle, x, z, heading, passiveMode };
    this.sendRaw({
      type: 'player:join',
      ...this.pendingProfile,
    });
  }

  public sendMove(payload: {
    x: number;
    z: number;
    heading: number;
    inVehicle: boolean;
    vehicleKind?: VehicleKind;
    vehicleName?: string;
    wantedStars: number;
    passiveMode: boolean;
    walkSpeed: number;
    jobTitle: string;
  }): void {
    const now = performance.now();
    if (now - this.lastMoveSentAt < 80) return;
    this.lastMoveSentAt = now;
    this.pendingProfile.x = payload.x;
    this.pendingProfile.z = payload.z;
    this.pendingProfile.heading = payload.heading;
    this.pendingProfile.passiveMode = payload.passiveMode;
    this.pendingProfile.jobTitle = payload.jobTitle;
    this.sendRaw({
      type: 'player:move',
      ...payload,
    });
  }

  public sendChat(channel: MpChatChannel, text: string): void {
    this.sendRaw({ type: 'chat:send', channel, text });
  }

  public sendRobberyAlert(spotName: string): void {
    this.sendRaw({ type: 'robbery:alert', spotName });
  }

  public sendTurfCaptured(turfId: string, turfName: string, owner: 'TG' | 'RIVAL'): void {
    this.sendRaw({ type: 'turf:captured', turfId, turfName, owner });
  }

  public dispose(): void {
    this.disposed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
  }
}
