import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import type { ChatEmotion, ChatRole } from './src/game/roleChats.ts';
import type { MpChatChannel, MpChatMessage, RemotePlayerState, VehicleKind } from './src/game/types.ts';
import { analyzeBangladeshiTone } from './src/game/voiceProsody.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MAX_TTS_CACHE = 240;
const ttsCache = new Map<string, { audioBase64: string; voiceName: string; model: string }>();

interface ConnectedPlayer extends RemotePlayerState {
  ws: WebSocket;
  lastSeen: number;
}

const serverPlayers = new Map<number, ConnectedPlayer>();
const serverTurfOwners = new Map<string, 'TG' | 'RIVAL'>();
const serverChatHistory: MpChatMessage[] = [];
let nextServerPlayerId = 1;
let msgCounter = 1;

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function toPublicPlayer(p: ConnectedPlayer): RemotePlayerState {
  return {
    id: p.id,
    name: p.name,
    gangTag: p.gangTag,
    jobTitle: p.jobTitle,
    x: p.x,
    z: p.z,
    heading: p.heading,
    inVehicle: p.inVehicle,
    vehicleKind: p.vehicleKind,
    vehicleName: p.vehicleName,
    wantedStars: p.wantedStars,
    passiveMode: p.passiveMode,
    walkSpeed: p.walkSpeed,
    pingMs: p.pingMs,
  };
}

function broadcastAll(payload: unknown, excludeId?: number): void {
  const raw = JSON.stringify(payload);
  for (const [pid, p] of serverPlayers.entries()) {
    if (excludeId !== undefined && pid === excludeId) continue;
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(raw);
    }
  }
}

function broadcastProximity(
  payload: unknown,
  originX: number,
  originZ: number,
  radiusMeters: number
): void {
  const raw = JSON.stringify(payload);
  const rSq = radiusMeters * radiusMeters;
  for (const p of serverPlayers.values()) {
    if (p.ws.readyState !== WebSocket.OPEN) continue;
    const dx = p.x - originX;
    const dz = p.z - originZ;
    if (dx * dx + dz * dz <= rSq) {
      p.ws.send(raw);
    }
  }
}

function pushGlobalHistory(msg: MpChatMessage): void {
  serverChatHistory.push(msg);
  if (serverChatHistory.length > 40) {
    serverChatHistory.shift();
  }
}

let aiClient: GoogleGenAI | null = null;
let activeApiKey: string | null = null;
let rejectedApiKey: string | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === rejectedApiKey) {
    return null;
  }
  if (!aiClient || activeApiKey !== apiKey) {
    activeApiKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

function cacheTts(
  key: string,
  value: { audioBase64: string; voiceName: string; model: string }
): void {
  if (ttsCache.size >= MAX_TTS_CACHE) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey) ttsCache.delete(oldestKey);
  }
  ttsCache.set(key, value);
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim() || '';
    const keyRejected = Boolean(rawKey && rawKey === rejectedApiKey);
    res.json({
      ok: true,
      ttsConfigured: Boolean(getAiClient()),
      keyRejected,
      onlinePlayers: serverPlayers.size,
    });
  });

  app.post('/api/tts', async (req, res) => {
    const body = (req.body ?? {}) as {
      text?: unknown;
      isFemale?: unknown;
      emotion?: unknown;
      role?: unknown;
    };

    const rawText = typeof body.text === 'string' ? body.text.trim() : '';
    if (!rawText || rawText.length > 400) {
      res.status(400).json({ error: 'Valid Bengali text (1-400 chars) is required.' });
      return;
    }

    const isFemale = Boolean(body.isFemale);
    const emotion = (typeof body.emotion === 'string' ? body.emotion : 'neutral') as ChatEmotion;
    const role = (typeof body.role === 'string' ? body.role : undefined) as ChatRole | undefined;

    const plan = analyzeBangladeshiTone(rawText, isFemale, emotion, role);
    const cacheKey = `${isFemale ? 'F' : 'M'}:${role ?? 'any'}:${plan.detectedEmotion}:${plan.cleanText}`;

    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({
        audioBase64: cached.audioBase64,
        mimeType: 'audio/wav',
        voiceName: cached.voiceName,
        model: cached.model,
        cached: true,
      });
      return;
    }

    const currentKey = process.env.GEMINI_API_KEY?.trim() || '';
    if (currentKey && currentKey === rejectedApiKey) {
      res.status(403).json({
        error: 'GEMINI_API_KEY was rejected (403). Please update GEMINI_API_KEY in Settings > Secrets.',
        code: 'API_KEY_REJECTED',
      });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in Secrets.',
        code: 'NO_API_KEY',
      });
      return;
    }

    const model = plan.useFlashExpressiveModel
      ? 'gemini-3.8-flash-tts'
      : 'gemini-3.8-flash-lite-tts';

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: plan.useFlashExpressiveModel ? plan.scriptedText : plan.cleanText,
                speechMetadata: {
                  style: plan.bangladeshiStylePrompt,
                },
              } as { text: string; speechMetadata?: { style: string } },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: plan.preferredGeminiVoice,
              },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        res.status(502).json({ error: 'No audio generated by Gemini TTS.' });
        return;
      }

      cacheTts(cacheKey, {
        audioBase64,
        voiceName: plan.preferredGeminiVoice,
        model,
      });

      res.json({
        audioBase64,
        mimeType: 'audio/wav',
        voiceName: plan.preferredGeminiVoice,
        model,
        cached: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini TTS request failed';
      const isKeyRejected = /PERMISSION_DENIED|API_KEY_INVALID|403|leaked/i.test(message);
      if (isKeyRejected) {
        rejectedApiKey = currentKey || null;
        console.warn('[TTS Notice] Gemini API key rejected (403); update GEMINI_API_KEY in Settings > Secrets.');
      } else {
        console.warn('[TTS Warning]', message);
      }
      res.status(isKeyRejected ? 403 : 502).json({
        error: isKeyRejected
          ? 'GEMINI_API_KEY needs to be updated in Settings > Secrets.'
          : message,
        code: isKeyRejected ? 'API_KEY_REJECTED' : 'TTS_UPSTREAM_ERROR',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const id = nextServerPlayerId++;
    const player: ConnectedPlayer = {
      ws,
      id,
      name: `Citizen_${id}`,
      gangTag: 'TG',
      jobTitle: 'Citizen',
      x: 2.4,
      z: 7.2,
      heading: 0,
      inVehicle: false,
      wantedStars: 0,
      passiveMode: false,
      walkSpeed: 0,
      pingMs: 24,
      lastSeen: Date.now(),
    };
    serverPlayers.set(id, player);

    sendJson(ws, {
      type: 'state:init',
      selfId: id,
      players: Array.from(serverPlayers.values()).map(toPublicPlayer),
      chatHistory: serverChatHistory,
      turfs: Object.fromEntries(serverTurfOwners.entries()),
    });

    broadcastAll({ type: 'player:joined', player: toPublicPlayer(player) }, id);

    ws.on('message', (rawBuf) => {
      player.lastSeen = Date.now();
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      if (msg.type === 'ping') {
        if (typeof msg.pingMs === 'number' && Number.isFinite(msg.pingMs)) {
          player.pingMs = Math.max(1, Math.min(999, Math.round(msg.pingMs)));
        }
        sendJson(ws, { type: 'pong', ts: msg.ts });
        return;
      }

      if (msg.type === 'player:join') {
        if (typeof msg.name === 'string' && msg.name.trim()) {
          player.name = msg.name.trim().slice(0, 24);
        }
        if (typeof msg.gangTag === 'string') {
          player.gangTag = msg.gangTag.trim().slice(0, 8) || 'RP';
        }
        if (typeof msg.jobTitle === 'string' && msg.jobTitle.trim()) {
          player.jobTitle = msg.jobTitle.trim().slice(0, 24);
        }
        if (typeof msg.x === 'number' && Number.isFinite(msg.x)) player.x = msg.x;
        if (typeof msg.z === 'number' && Number.isFinite(msg.z)) player.z = msg.z;
        if (typeof msg.heading === 'number' && Number.isFinite(msg.heading)) player.heading = msg.heading;
        if (typeof msg.passiveMode === 'boolean') player.passiveMode = msg.passiveMode;

        broadcastAll({ type: 'player:moved', player: toPublicPlayer(player) });
        return;
      }

      if (msg.type === 'player:move') {
        if (typeof msg.x === 'number' && Number.isFinite(msg.x)) player.x = msg.x;
        if (typeof msg.z === 'number' && Number.isFinite(msg.z)) player.z = msg.z;
        if (typeof msg.heading === 'number' && Number.isFinite(msg.heading)) player.heading = msg.heading;
        if (typeof msg.inVehicle === 'boolean') player.inVehicle = msg.inVehicle;
        if (typeof msg.vehicleKind === 'string') player.vehicleKind = msg.vehicleKind as VehicleKind;
        if (typeof msg.vehicleName === 'string') player.vehicleName = msg.vehicleName.slice(0, 32);
        if (typeof msg.wantedStars === 'number') player.wantedStars = Math.max(0, Math.min(5, msg.wantedStars));
        if (typeof msg.passiveMode === 'boolean') player.passiveMode = msg.passiveMode;
        if (typeof msg.walkSpeed === 'number') player.walkSpeed = msg.walkSpeed;
        if (typeof msg.jobTitle === 'string' && msg.jobTitle.trim()) {
          player.jobTitle = msg.jobTitle.trim().slice(0, 24);
        }

        broadcastAll({ type: 'player:moved', player: toPublicPlayer(player) }, id);
        return;
      }

      if (msg.type === 'chat:send') {
        const rawText = typeof msg.text === 'string' ? msg.text.trim().slice(0, 220) : '';
        if (!rawText) return;

        let channel = (typeof msg.channel === 'string' ? msg.channel : 'global') as MpChatChannel;
        let cleanText = rawText;

        if (rawText.startsWith('/me ')) {
          channel = 'me';
          cleanText = rawText.slice(4).trim();
        } else if (rawText.startsWith('/do ')) {
          channel = 'do';
          cleanText = rawText.slice(4).trim();
        } else if (rawText.startsWith('/ooc ')) {
          channel = 'global';
          cleanText = rawText.slice(5).trim();
        } else if (rawText.startsWith('/911 ')) {
          channel = 'dispatch';
          cleanText = rawText.slice(5).trim();
        }
        if (!cleanText) return;

        const chatMsg: MpChatMessage = {
          id: `mp-${Date.now()}-${msgCounter++}`,
          senderId: player.id,
          senderName: player.name,
          gangTag: player.gangTag,
          channel,
          text: cleanText,
          timestamp: Date.now(),
        };

        if (channel === 'local' || channel === 'me' || channel === 'do') {
          broadcastProximity({ type: 'chat:message', message: chatMsg }, player.x, player.z, 40);
        } else {
          pushGlobalHistory(chatMsg);
          broadcastAll({ type: 'chat:message', message: chatMsg });
        }
        return;
      }

      if (msg.type === 'robbery:alert') {
        const spotName = typeof msg.spotName === 'string' ? msg.spotName.slice(0, 48) : 'City Vault';
        const dispatchMsg: MpChatMessage = {
          id: `disp-${Date.now()}-${msgCounter++}`,
          senderId: 0,
          senderName: '999 DMP Dispatch',
          gangTag: 'DMP',
          channel: 'dispatch',
          text: `🚨 ${player.name} [${player.gangTag}] ${spotName}-এ ডাকাতি শুরু করেছে!`,
          timestamp: Date.now(),
        };
        pushGlobalHistory(dispatchMsg);
        broadcastAll({ type: 'chat:message', message: dispatchMsg });
        return;
      }

      if (msg.type === 'turf:captured') {
        const turfId = typeof msg.turfId === 'string' ? msg.turfId : '';
        const turfName = typeof msg.turfName === 'string' ? msg.turfName : turfId;
        const owner = msg.owner === 'RIVAL' ? 'RIVAL' : 'TG';
        if (!turfId) return;
        serverTurfOwners.set(turfId, owner);
        broadcastAll({ type: 'turf:updated', turfId, owner });

        const turfMsg: MpChatMessage = {
          id: `turf-${Date.now()}-${msgCounter++}`,
          senderId: 0,
          senderName: 'Turf Control',
          gangTag: owner,
          channel: 'dispatch',
          text: `🏴 ${player.name} (${player.gangTag}) ${turfName} এলাকা দখল করেছে!`,
          timestamp: Date.now(),
        };
        pushGlobalHistory(turfMsg);
        broadcastAll({ type: 'chat:message', message: turfMsg });
      }
    });

    ws.on('close', () => {
      serverPlayers.delete(id);
      broadcastAll({ type: 'player:left', id }, id);
    });
  });

  // Periodic stale client cleanup (60s inactivity)
  setInterval(() => {
    const cutoff = Date.now() - 60000;
    for (const [pid, p] of serverPlayers.entries()) {
      if (p.lastSeen < cutoff || p.ws.readyState === WebSocket.CLOSED) {
        serverPlayers.delete(pid);
        broadcastAll({ type: 'player:left', id: pid }, pid);
      }
    }
  }, 20000);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Dhaka City RP server (HTTP + WebSocket /ws) running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();

