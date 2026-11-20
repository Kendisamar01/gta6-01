let sharedContext = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let muted = false;

export function getContext() {
  if (sharedContext) return sharedContext;
  const Constructor = window.AudioContext || window.webkitAudioContext;
  if (!Constructor) return null;
  try {
    sharedContext = new Constructor();
    master = sharedContext.createGain();
    master.gain.value = 0.35;
    master.connect(sharedContext.destination);
  } catch {
    sharedContext = null;
  }
  return sharedContext;
}

function resume() {
  const context = getContext();
  if (context && context.state === 'suspended') context.resume().catch(() => {});
}

export function init(api) {
  getContext();
  window.addEventListener('keydown', resume);
  window.addEventListener('pointerdown', resume);
}

export function mute(flag) {
  muted = flag;
  if (master && sharedContext) master.gain.setTargetAtTime(flag ? 0 : 0.35, sharedContext.currentTime, 0.04);
}

function tone(frequency, duration, type, volume, sweep = 0) {
  const context = getContext();
  if (!context || muted || context.state !== 'running') return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (sweep) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + sweep), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function noise(duration, volume, cutoff) {
  const context = getContext();
  if (!context || muted || context.state !== 'running') return;
  const now = context.currentTime;
  const frames = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = context.createGain();
  gain.gain.value = volume;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(now);
}

export function event(event, world) {
  switch (event.type) {
    case 'shot':
      noise(0.12, 0.28, 2600);
      tone(180, 0.1, 'square', 0.1, -90);
      break;
    case 'punch':
      noise(0.08, 0.16, 900);
      break;
    case 'impact':
      noise(0.1, 0.14, event.cause === 'metal' ? 3400 : 1200);
      break;
    case 'crash':
      noise(0.28, 0.35, 1400);
      tone(90, 0.22, 'sawtooth', 0.16, -45);
      break;
    case 'explosion':
      noise(0.85, 0.6, 800);
      tone(110, 0.7, 'sawtooth', 0.3, -70);
      break;
    case 'horn':
      tone(420, 0.28, 'square', 0.12);
      tone(318, 0.28, 'square', 0.1);
      break;
    case 'wanted':
      tone(640, 0.16, 'triangle', 0.14, 180);
      break;
    case 'missionComplete':
      tone(523, 0.18, 'triangle', 0.15);
      window.setTimeout(() => tone(659, 0.18, 'triangle', 0.15), 110);
      window.setTimeout(() => tone(784, 0.3, 'triangle', 0.18), 220);
      break;
    case 'notice':
      tone(event.kind === 'warn' ? 320 : 720, 0.07, 'sine', 0.08);
      break;
    case 'hurt':
      tone(150, 0.2, 'sawtooth', 0.2, -60);
      break;
    default:
      break;
  }
}

export function update(world) {
  const context = getContext();
  if (!context || context.state !== 'running') return;
  const car = world.vehicles.find((item) => item.id === world.player.inVehicle);
  const speed = car ? Math.abs(car.speed) : 0;
  if (!engineOsc) {
    engineOsc = context.createOscillator();
    engineGain = context.createGain();
    engineOsc.type = 'sawtooth';
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }
  engineOsc.frequency.setTargetAtTime(52 + speed * 0.62, context.currentTime, 0.08);
  engineGain.gain.setTargetAtTime(muted || speed < 3 ? 0 : Math.min(0.11, 0.025 + speed * 0.00035), context.currentTime, 0.1);
  if (!sirenOsc) {
    sirenOsc = context.createOscillator();
    sirenGain = context.createGain();
    sirenOsc.type = 'square';
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
  }
  sirenOsc.frequency.setTargetAtTime(560 + Math.sin(world.elapsed * 7) * 170, context.currentTime, 0.04);
  sirenGain.gain.setTargetAtTime(muted || world.wanted === 0 ? 0 : 0.035, context.currentTime, 0.1);
}
