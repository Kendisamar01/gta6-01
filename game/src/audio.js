let context = null;
let master = null;
let noiseBuffer = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let engineFilter = null;
let sirenOsc = null;
let sirenGain = null;

export function initAudio() {
  if (context !== null) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  context = new AudioContextClass();
  master = context.createGain();
  master.gain.value = muted ? 0 : 0.42;
  master.connect(context.destination);

  const length = Math.floor(context.sampleRate * 0.7);
  noiseBuffer = context.createBuffer(1, length, context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  let smoothed = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    smoothed = (smoothed + 0.02 * white) / 1.02;
    samples[i] = smoothed * 2.6;
  }

  engineOsc = context.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 70;
  engineFilter = context.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 420;
  engineGain = context.createGain();
  engineGain.gain.value = 0;
  engineOsc.connect(engineFilter).connect(engineGain).connect(master);
  engineOsc.start();

  sirenOsc = context.createOscillator();
  sirenOsc.type = 'square';
  sirenOsc.frequency.value = 620;
  sirenGain = context.createGain();
  sirenGain.gain.value = 0;
  sirenOsc.connect(sirenGain).connect(master);
  sirenOsc.start();
}

export function toggleMute() {
  muted = !muted;
  if (master !== null && context !== null) {
    master.gain.setTargetAtTime(muted ? 0 : 0.42, context.currentTime, 0.04);
  }
  return muted;
}

export function isMuted() {
  return muted;
}

export function playNote(frequency, duration, type = 'sine', gain = 0.1, delay = 0) {
  if (context === null || muted) return;
  const now = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(gain, now + 0.015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(envelope).connect(master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
}

function burst(duration, gain, filterFrequency, delay = 0) {
  if (context === null || muted || noiseBuffer === null) return;
  const now = context.currentTime + delay;
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFrequency;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(gain, now);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(envelope).connect(master);
  source.start(now);
  source.stop(now + duration + 0.03);
}

function sweep(from, to, duration, gain, type = 'sine') {
  if (context === null || muted) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
  envelope.gain.setValueAtTime(gain, now);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(envelope).connect(master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

export function sfx(name, parameter = 0) {
  if (context === null || muted) return;
  if (name === 'gunshot') {
    burst(0.16, 0.5 * (parameter || 1), 2600);
    sweep(180, 60, 0.12, 0.16, 'square');
  } else if (name === 'explosion') {
    burst(0.7, 0.8, 900);
    sweep(110, 34, 0.65, 0.35, 'sawtooth');
  } else if (name === 'horn') {
    const frequency = parameter || 350;
    playNote(frequency, 0.3, 'square', 0.14);
    playNote(frequency * 1.26, 0.3, 'square', 0.1);
  } else if (name === 'punch') {
    burst(0.09, 0.35, 700);
    sweep(150, 80, 0.09, 0.1, 'triangle');
  } else if (name === 'hit') {
    playNote(520, 0.08, 'square', 0.1);
    playNote(760, 0.07, 'sine', 0.07, 0.04);
  } else if (name === 'reload') {
    burst(0.06, 0.18, 1800);
    playNote(280, 0.07, 'square', 0.06, 0.1);
  } else if (name === 'reloadDone') {
    playNote(620, 0.08, 'square', 0.09);
  } else if (name === 'pickup' || name === 'cash') {
    playNote(660, 0.09, 'sine', 0.12);
    playNote(990, 0.12, 'sine', 0.1, 0.07);
  } else if (name === 'ui') {
    playNote(520, 0.06, 'sine', 0.07);
  } else if (name === 'checkpoint') {
    playNote(720, 0.1, 'triangle', 0.12);
    playNote(1080, 0.14, 'triangle', 0.1, 0.09);
  } else if (name === 'mission') {
    playNote(330, 0.16, 'triangle', 0.12);
    playNote(494, 0.2, 'triangle', 0.11, 0.12);
    playNote(660, 0.25, 'triangle', 0.1, 0.24);
  } else if (name === 'success') {
    [523, 659, 784, 1046].forEach((frequency, i) => playNote(frequency, 0.24, 'sine', 0.11, i * 0.1));
  } else if (name === 'fail') {
    [330, 262, 196].forEach((frequency, i) => playNote(frequency, 0.28, 'triangle', 0.11, i * 0.12));
  } else if (name === 'wanted') {
    [440, 370, 294].forEach((frequency, i) => playNote(frequency, 0.18, 'square', 0.09, i * 0.11));
  }
}

export function setEngine(speed, active) {
  if (context === null || engineOsc === null) return;
  const now = context.currentTime;
  const magnitude = Math.abs(speed);
  engineOsc.frequency.setTargetAtTime(58 + magnitude * 0.62, now, 0.08);
  engineFilter.frequency.setTargetAtTime(320 + magnitude * 3.4, now, 0.1);
  engineGain.gain.setTargetAtTime(active ? 0.055 + Math.min(0.06, magnitude * 0.00025) : 0, now, 0.12);
}

export function setSiren(active, proximity, phase) {
  if (context === null || sirenOsc === null) return;
  const now = context.currentTime;
  sirenOsc.frequency.setTargetAtTime(560 + (Math.sin(phase) > 0 ? 190 : 0), now, 0.04);
  sirenGain.gain.setTargetAtTime(active ? 0.035 * proximity : 0, now, 0.1);
}

export function audioReady() {
  return context !== null;
}
