
let audioCtx: AudioContext | null = null;
let isMuted = false;
let globalVolume = 0.5;

const getContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const initSounds = () => {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
};

const createNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

let noiseBuffer: AudioBuffer | null = null;

const playNoise = (duration: number, startTime: number, vol: number = 1) => {
    const ctx = getContext();
    if (!ctx) return;
    
    if (!noiseBuffer) noiseBuffer = createNoiseBuffer(ctx);

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    
    const noiseGain = ctx.createGain();
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseGain.gain.setValueAtTime(vol * globalVolume * 0.5, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    noiseSrc.start(startTime);
    noiseSrc.stop(startTime + duration);
};

const createOscillator = (type: OscillatorType, freq: number, duration: number, startTime: number, vol: number = 1) => {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(vol * globalVolume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playSound = (type: 'flip' | 'bid' | 'hover' | 'win_trick' | 'round_end' | 'your_turn') => {
  if (isMuted) return;
  const ctx = getContext();
  if (!ctx) return;

  const t = ctx.currentTime;

  switch (type) {
    case 'hover':
      playNoise(0.1, t, 0.4);
      break;
      
    case 'flip':
      playNoise(0.15, t, 0.8);
      createOscillator('triangle', 200, 0.05, t, 0.1);
      break;

    case 'bid':
      createOscillator('square', 440, 0.1, t, 0.2);
      createOscillator('square', 880, 0.1, t + 0.1, 0.2);
      break;

    case 'your_turn':
      createOscillator('sine', 880, 0.3, t, 0.4);
      createOscillator('sine', 1760, 0.6, t, 0.2);
      break;

    case 'win_trick':
      createOscillator('square', 523.25, 0.1, t, 0.2);
      createOscillator('square', 659.25, 0.1, t + 0.1, 0.2);
      createOscillator('square', 783.99, 0.1, t + 0.2, 0.2);
      createOscillator('square', 1046.50, 0.4, t + 0.3, 0.2);
      break;

    case 'round_end':
      [0, 0.15, 0.3].forEach(offset => {
         createOscillator('sawtooth', 440, 0.1, t + offset, 0.3);
      });
      createOscillator('sawtooth', 554.37, 0.4, t + 0.45, 0.3);
      createOscillator('sawtooth', 659.25, 0.8, t + 0.45, 0.3);
      break;
  }
};

export const setVolume = (val: number) => {
    globalVolume = val;
    isMuted = val === 0;
};

export const getVolume = () => globalVolume;

export const toggleMute = () => {
  isMuted = !isMuted;
  return isMuted;
};

export const getMuteStatus = () => isMuted;
