import type { ChatEmotion, ChatRole } from './roleChats';
import type { RadioStationId, WeaponId } from './types';
import { analyzeBangladeshiTone, type BangladeshiSpeechPlan } from './voiceProsody';

const FEMALE_VOICE_RE =
  /nabanita|tanisha|mousumi|shreya|sweta|female|woman|girl|zira|heera|google বাংলা/i;
const MALE_VOICE_RE =
  /pradeep|bashkar|anirban|hemant|tanvir|rafiq|\bmale\b|\bman\b|guy|david|ravi|madhur|niladri/i;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private muted = false;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesBound = false;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private ttsCache = new Map<string, string>();
  private neuralTtsUnavailable = false;
  private speechGen = 0;
  private clauseTimer: number | null = null;
  private radioStation: RadioStationId = 'off';
  private radioStep = 0;
  private radioAccum = 0;

  private loadVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();
    if (!this.voicesBound) {
      this.voicesBound = true;
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        this.voices = window.speechSynthesis.getVoices();
      });
    }
  }

  public unlock(): void {
    this.loadVoices();
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 52;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 180;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      this.stopSpeech();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public stopSpeech(): void {
    this.speechGen += 1;
    if (this.clauseTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.clauseTimer);
      this.clauseTimer = null;
    }
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio.currentTime = 0;
      } catch {
        // ignore audio pause errors
      }
      this.activeHtmlAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore speech cancel errors
      }
    }
  }

  private pickGenderedBengaliVoice(isFemale: boolean): {
    voice: SpeechSynthesisVoice | null;
    matchedExactGender: boolean;
  } {
    this.loadVoices();
    const bnVoices = this.voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('bn') ||
        /bengali|bangla|বাংলা/i.test(v.name)
    );
    if (bnVoices.length === 0) {
      return { voice: null, matchedExactGender: false };
    }

    // Prioritize bn-BD (Bangladeshi) over bn-IN
    const sorted = [...bnVoices].sort((a, b) => {
      const aBd = a.lang.toLowerCase() === 'bn-bd' ? 0 : 1;
      const bBd = b.lang.toLowerCase() === 'bn-bd' ? 0 : 1;
      return aBd - bBd;
    });

    if (isFemale) {
      const femaleExact = sorted.find(
        (v) => FEMALE_VOICE_RE.test(v.name) && !MALE_VOICE_RE.test(v.name)
      );
      if (femaleExact) return { voice: femaleExact, matchedExactGender: true };
      const nonMale = sorted.find((v) => !MALE_VOICE_RE.test(v.name));
      return { voice: nonMale ?? sorted[0], matchedExactGender: Boolean(nonMale) };
    }

    const maleExact = sorted.find(
      (v) => MALE_VOICE_RE.test(v.name) && !FEMALE_VOICE_RE.test(v.name)
    );
    if (maleExact) return { voice: maleExact, matchedExactGender: true };

    return { voice: sorted[0], matchedExactGender: false };
  }

  private playDataUriAudio(dataUri: string, gen: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.muted || this.speechGen !== gen) {
        resolve(false);
        return;
      }
      try {
        const audio = new Audio(dataUri);
        audio.volume = 1.0;
        this.activeHtmlAudio = audio;
        audio.onended = () => {
          if (this.activeHtmlAudio === audio) this.activeHtmlAudio = null;
          resolve(true);
        };
        audio.onerror = () => {
          if (this.activeHtmlAudio === audio) this.activeHtmlAudio = null;
          resolve(false);
        };
        void audio.play().catch(() => {
          if (this.activeHtmlAudio === audio) this.activeHtmlAudio = null;
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  private speakLocalBangladeshiProsody(
    plan: BangladeshiSpeechPlan,
    isFemale: boolean,
    role: ChatRole | undefined,
    gen: number
  ): void {
    if (this.muted || this.speechGen !== gen) return;

    if (plan.detectedEmotion === 'laugh') {
      this.playLaugh(isFemale);
    } else if (plan.detectedEmotion === 'cry') {
      this.playCry(isFemale);
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const { voice, matchedExactGender } = this.pickGenderedBengaliVoice(isFemale);

    // Distinct gender register calibration so Male never sounds Female and Female stays sweet
    let basePitch: number;
    let baseRate: number;
    if (isFemale) {
      basePitch = matchedExactGender
        ? role === 'hostage'
          ? 1.18
          : 1.14
        : 1.38;
      baseRate = 0.96;
    } else {
      if (matchedExactGender) {
        basePitch = role === 'dealer' || role === 'gang' ? 0.88 : 0.95;
      } else {
        // When OS only provides a female voice (e.g. Google বাংলা), shift down clearly into male chest register
        basePitch =
          role === 'dealer' || role === 'gang'
            ? 0.54
            : role === 'shopkeeper'
            ? 0.66
            : 0.59;
      }
      baseRate = 0.94;
    }

    const speakClauseAt = (idx: number) => {
      if (this.muted || this.speechGen !== gen || idx >= plan.clauses.length) return;
      const clause = plan.clauses[idx];
      try {
        const utter = new SpeechSynthesisUtterance(clause.text);
        utter.lang = voice?.lang || 'bn-BD';
        if (voice) utter.voice = voice;
        utter.pitch = clamp(basePitch + clause.pitchOffset, 0.42, 1.65);
        utter.rate = clamp(baseRate * clause.rateFactor, 0.72, 1.35);
        utter.volume = clause.volume;

        const scheduleNext = () => {
          if (this.muted || this.speechGen !== gen) return;
          if (idx + 1 < plan.clauses.length) {
            this.clauseTimer = window.setTimeout(() => {
              speakClauseAt(idx + 1);
            }, clause.pauseMs);
          }
        };

        utter.onend = scheduleNext;
        utter.onerror = scheduleNext;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore unsupported browser TTS errors
      }
    };

    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore cancel errors
    }

    const initialDelay =
      plan.detectedEmotion === 'laugh' || plan.detectedEmotion === 'cry' ? 420 : 10;
    this.clauseTimer = window.setTimeout(() => {
      speakClauseAt(0);
    }, initialDelay);
  }

  // Authentic Bangladeshi Voice (Server Gemini 3.8 Neural TTS when online + Clause-by-Clause Gendered Bangladeshi Fallback)
  public speakBengali(
    text: string,
    isFemale = false,
    emotion: ChatEmotion = 'neutral',
    role?: ChatRole
  ): void {
    if (this.muted) return;
    this.unlock();
    this.stopSpeech();
    const gen = this.speechGen;

    const plan = analyzeBangladeshiTone(text, isFemale, emotion, role);
    const cacheKey = `${isFemale ? 'F' : 'M'}:${role ?? 'any'}:${plan.detectedEmotion}:${plan.cleanText}`;

    const cachedUri = this.ttsCache.get(cacheKey);
    if (cachedUri) {
      void this.playDataUriAudio(cachedUri, gen);
      return;
    }

    const canTryServerTts =
      !this.neuralTtsUnavailable &&
      typeof navigator !== 'undefined' &&
      navigator.onLine !== false;

    if (!canTryServerTts) {
      this.speakLocalBangladeshiProsody(plan, isFemale, role, gen);
      return;
    }

    void (async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2600);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: plan.cleanText,
            isFemale,
            emotion: plan.detectedEmotion,
            role,
          }),
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        if (this.muted || this.speechGen !== gen) return;

        if (res.ok) {
          const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
          if (data.audioBase64) {
            const dataUri = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
            if (this.ttsCache.size > 80) {
              const firstKey = this.ttsCache.keys().next().value;
              if (firstKey) this.ttsCache.delete(firstKey);
            }
            this.ttsCache.set(cacheKey, dataUri);
            const played = await this.playDataUriAudio(dataUri, gen);
            if (played) return;
          }
        } else if (res.status === 503 || res.status === 403) {
          this.neuralTtsUnavailable = true;
        }
      } catch {
        window.clearTimeout(timeoutId);
      }

      if (!this.muted && this.speechGen === gen) {
        this.speakLocalBangladeshiProsody(plan, isFemale, role, gen);
      }
    })();
  }

  // Realistic human multi-syllable laugh ("Ha-ha-ha-ha!") via vocal formant filtering
  public playLaugh(isFemale = false): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const basePitch = isFemale ? 270 : 122;
    const syllables = [0, 0.13, 0.27, 0.42, 0.57];

    syllables.forEach((offset, idx) => {
      if (!this.ctx) return;
      const t0 = now + offset;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const fStart = basePitch * (1.14 - idx * 0.045);
      osc.frequency.setValueAtTime(fStart, t0);
      osc.frequency.exponentialRampToValueAtTime(fStart * 0.8, t0 + 0.11);

      const f1 = this.ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = isFemale ? 850 : 620;
      f1.Q.value = 4.2;

      const f2 = this.ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = isFemale ? 1360 : 1040;
      f2.Q.value = 5.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.055 - idx * 0.006, t0 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.115);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.125);
    });
  }

  // Realistic human trembling sob/cry ("Uhu-huu...") via vibrato glottal pulse + /u/ formant
  public playCry(isFemale = false): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const basePitch = isFemale ? 305 : 145;
    const sobs = [0, 0.28, 0.58];

    sobs.forEach((offset, idx) => {
      if (!this.ctx) return;
      const t0 = now + offset;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(basePitch * 1.05, t0);
      osc.frequency.linearRampToValueAtTime(basePitch * 0.82, t0 + 0.22);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 6.5;
      lfoGain.gain.value = 10;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const formant = this.ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.value = isFemale ? 490 : 350;
      formant.Q.value = 3.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.065 - idx * 0.008, t0 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);

      osc.connect(formant);
      formant.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(t0);
      osc.start(t0);
      lfo.stop(t0 + 0.25);
      osc.stop(t0 + 0.25);
    });
  }

  public updateEngine(inVehicle: boolean, speedRatio: number, isCng = false): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineFilter) return;
    const now = this.ctx.currentTime;
    if (!inVehicle || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    const clamped = Math.min(1, Math.max(0, speedRatio));
    const baseFreq = isCng ? 78 : 48;
    const targetFreq = baseFreq + clamped * (isCng ? 145 : 115);
    const targetFilter = (isCng ? 280 : 170) + clamped * 440;
    const targetGain = 0.032 + clamped * 0.042;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.06);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);
  }

  public playHorn(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(349.23, now);
    osc2.frequency.setValueAtTime(440.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.03);
    gain.gain.setValueAtTime(0.07, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 950;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  public playPoliceSirenChirp(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.linearRampToValueAtTime(980, now + 0.28);
    osc.frequency.linearRampToValueAtTime(620, now + 0.56);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.56);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.58);
  }

  public playAlarmBeep(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(660, now + 0.14);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playCashReward(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    osc.frequency.setValueAtTime(783.99, now + 0.16);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playGunshot(weapon: WeaponId): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (weapon === 'fists') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
      return;
    }

    const duration = weapon === 'shotgun' ? 0.24 : weapon === 'smg' ? 0.09 : 0.14;
    const sampleCount = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = weapon === 'shotgun' ? 520 : weapon === 'smg' ? 1150 : 880;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(weapon === 'shotgun' ? 0.24 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  public playDoorClick(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playTurboBoost(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.34);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playSprayMod(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const sampleCount = Math.floor(this.ctx.sampleRate * 0.22);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  public playDrillPulse(heatRatio: number): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 + heatRatio * 240, now);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  // GTA 5 Police Scanner Walkie-Talkie Squelch + Static Burst
  public playRadioSquelch(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 0.14;
    const sampleCount = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.45;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1750;
    filter.Q.value = 2.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);

    const chirp = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(1420, now);
    chirp.frequency.setValueAtTime(1880, now + 0.04);
    cGain.gain.setValueAtTime(0.032, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    chirp.connect(cGain);
    cGain.connect(this.ctx.destination);
    chirp.start(now);
    chirp.stop(now + 0.095);
  }

  public playPoliceDispatchSpeech(text: string): void {
    if (this.muted) return;
    this.playRadioSquelch();
    window.setTimeout(() => {
      if (!this.muted) {
        this.speakBengali(text, true, 'neutral', 'police');
      }
    }, 150);
  }

  // GTA 5 Iconic Deep Wasted Impact Boom
  public playWastedTone(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(135, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 1.25);
    subGain.gain.setValueAtTime(0.18, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 1.5);

    const chord = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    chord.type = 'triangle';
    chord.frequency.setValueAtTime(220, now);
    chord.frequency.exponentialRampToValueAtTime(110, now + 1.3);
    cGain.gain.setValueAtTime(0.07, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    chord.connect(cGain);
    cGain.connect(this.ctx.destination);
    chord.start(now);
    chord.stop(now + 1.45);
  }

  // GTA 5 Iconic Descending Busted Arrest Tone
  public playBustedTone(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [392, 349.23, 293.66];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const t0 = now + i * 0.19;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 680;
      g.gain.setValueAtTime(0.06, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public playWeaponClick(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.045);
    g.gain.setValueAtTime(0.045, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playHitMarker(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1650, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.04);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public setRadioStation(station: RadioStationId): void {
    this.radioStation = station;
    this.radioStep = 0;
    this.radioAccum = 0;
    this.playWeaponClick();
    if (this.muted || station === 'off') return;
    const intros: Record<Exclude<RadioStationId, 'off'>, { line: string; female: boolean }> = {
      dhaka_bass: { line: 'আপনি শুনছেন ঢাকা বেইস এফএম! শহরের হট ট্র্যাপ বিটস!', female: false },
      bangla_rock: { line: 'বাংলা রক নাইন্টি ফোর পয়েন্ট সিক্স, সাথে আছি আমরা!', female: false },
      vice_wave: { line: 'পদ্মা চিল ওয়েভ—রাতের ঢাকার নিওন রাইডে স্বাগতম!', female: true },
      talk_dhaka: { line: 'টক রেডিও ঢাকা—গুলশান-বনানীর জ্যাম আর গ্যাং খবরে স্বাগতম!', female: true },
    };
    const pick = intros[station];
    this.speakBengali(pick.line, pick.female, 'happy', 'civilian');
  }

  public updateRadio(inVehicle: boolean, dt: number): void {
    if (this.muted || !inVehicle || this.radioStation === 'off' || !this.ctx) return;
    const stepInterval =
      this.radioStation === 'dhaka_bass'
        ? 0.24
        : this.radioStation === 'bangla_rock'
        ? 0.22
        : this.radioStation === 'vice_wave'
        ? 0.27
        : 0.9;

    this.radioAccum += dt;
    if (this.radioAccum < stepInterval) return;
    this.radioAccum = 0;
    const step = this.radioStep++ % 8;
    const now = this.ctx.currentTime;

    if (this.radioStation === 'talk_dhaka') {
      // Soft ambient broadcast hum pulse
      if (step === 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        g.gain.setValueAtTime(0.012, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
      }
      return;
    }

    const scales: Record<'dhaka_bass' | 'bangla_rock' | 'vice_wave', number[]> = {
      dhaka_bass: [65.41, 65.41, 77.78, 65.41, 98.0, 87.31, 77.78, 58.27],
      bangla_rock: [110, 110, 146.83, 130.81, 164.81, 146.83, 130.81, 98],
      vice_wave: [130.81, 164.81, 196.0, 246.94, 196.0, 164.81, 146.83, 196.0],
    };

    const freq = scales[this.radioStation][step];
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type =
      this.radioStation === 'dhaka_bass'
        ? 'triangle'
        : this.radioStation === 'bangla_rock'
        ? 'sawtooth'
        : 'sine';
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.value = this.radioStation === 'vice_wave' ? 1200 : 540;
    const vol = step % 2 === 0 ? 0.032 : 0.02;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + stepInterval * 0.85);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + stepInterval * 0.9);
  }

  public dispose(): void {
    this.stopSpeech();
    try {
      this.engineOsc?.stop();
      void this.ctx?.close();
    } catch {
      // ignore audio cleanup errors
    }
  }
}
