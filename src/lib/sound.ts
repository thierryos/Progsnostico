import { storage } from './storage';

export type SoundName = 'flip' | 'bid' | 'hover' | 'win_trick' | 'round_end' | 'your_turn';

const VOLUME_KEY = 'prog.volume';

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
const readVolume = () => {
  const saved = Number(storage.get(VOLUME_KEY) ?? NaN);
  return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.5;
};

let volume = readVolume();

/**
 * Navegadores só liberam áudio depois de um gesto do usuário.
 * Chamado no primeiro toque/clique (ver main.tsx).
 */
export const unlockAudio = () => {
  try {
    if (!audioCtx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
};

export const getVolume = () => volume;

export const setVolume = (value: number) => {
  volume = Math.min(1, Math.max(0, value));
  storage.set(VOLUME_KEY, String(volume));
};

const tone = (
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  duration: number,
  start: number,
  gainValue: number,
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(gainValue * volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
};

const noise = (ctx: AudioContext, duration: number, start: number, gainValue: number) => {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue * volume * 0.5, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(start);
  src.stop(start + duration);
};

export const playSound = (name: SoundName) => {
  const ctx = audioCtx;
  if (!ctx || ctx.state !== 'running' || volume <= 0) return;
  const t = ctx.currentTime;

  switch (name) {
    case 'hover':
      noise(ctx, 0.08, t, 0.3);
      break;
    case 'flip':
      noise(ctx, 0.15, t, 0.8);
      tone(ctx, 'triangle', 200, 0.05, t, 0.1);
      break;
    case 'bid':
      tone(ctx, 'square', 440, 0.1, t, 0.2);
      tone(ctx, 'square', 880, 0.1, t + 0.1, 0.2);
      break;
    case 'your_turn':
      tone(ctx, 'sine', 880, 0.3, t, 0.4);
      tone(ctx, 'sine', 1760, 0.6, t, 0.2);
      break;
    case 'win_trick':
      [523.25, 659.25, 783.99].forEach((f, i) => tone(ctx, 'square', f, 0.1, t + i * 0.1, 0.2));
      tone(ctx, 'square', 1046.5, 0.4, t + 0.3, 0.2);
      break;
    case 'round_end':
      [0, 0.15, 0.3].forEach((offset) => tone(ctx, 'sawtooth', 440, 0.1, t + offset, 0.3));
      tone(ctx, 'sawtooth', 554.37, 0.4, t + 0.45, 0.3);
      tone(ctx, 'sawtooth', 659.25, 0.8, t + 0.45, 0.3);
      break;
  }
};

export const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sem suporte */
  }
};
