let context = null;
let master = null;
let noise = null;
let muted = false;
let motor = null;
let motorGain = null;
let motorFilter = null;
let siren = null;
let sirenGain = null;

function audioClass() {
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

export function initAudio() {
  const AudioCtor = audioClass();
  if (AudioCtor === null) return;
  if (context !== null) {
    if (context.state === 'suspended') context.resume();
    return;
  }

  context = new AudioCtor();
  master = context.createGain();
  master.gain.value = muted ? 0 : 0.4;
  master.connect(context.destination);

  const length = Math.floor(context.sampleRate * 0.6);
  noise = context.createBuffer(1, length, context.sampleRate);
  const samples = noise.getChannelData(0);
  let state = 0x9e3779b9;
  let smooth = 0;
  for (let i = 0; i < length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const white = (state / 0xffffffff) * 2 - 1;
    smooth = (smooth + white * 0.03) / 1.03;
    samples[i] = smooth * 2.8;
  }

  motor = context.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 64;
  motorFilter = context.createBiquadFilter();
  motorFilter.type = 'lowpass';
  motorFilter.frequency.value = 380;
  motorGain = context.createGain();
  motorGain.gain.value = 0;
  motor.connect(motorFilter).connect(motorGain).connect(master);
  motor.start();

  siren = context.createOscillator();
  siren.type = 'square';
  siren.frequency.value = 610;
  sirenGain = context.createGain();
  sirenGain.gain.value = 0;
  siren.connect(sirenGain).connect(master);
  siren.start();
}

export function toggleMute() {
  muted = !muted;
  if (master !== null && context !== null) {
    master.gain.setTargetAtTime(muted ? 0 : 0.4, context.currentTime, 0.04);
  }
  return muted;
}

export function isMuted() {
  return muted;
}

export function audioReady() {
  return context !== null;
}

export function playNote(frequency, duration, type = 'sine', gain = 0.1, delay = 0) {
  if (context === null || muted) return;
  const when = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, when);
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(gain, when + 0.015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(envelope).connect(master);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.04);
}

function hiss(duration, gain, cutoff, delay = 0) {
  if (context === null || muted || noise === null) return;
  const when = context.currentTime + delay;
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(gain, when);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter).connect(envelope).connect(master);
  source.start(when);
  source.stop(when + duration + 0.03);
}

function glide(from, to, duration, gain, type = 'sine') {
  if (context === null || muted) return;
  const when = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, when);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + duration);
  envelope.gain.setValueAtTime(gain, when);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(envelope).connect(master);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.03);
}

function notes(list, type, gain, spacing = 0.1) {
  list.forEach((frequency, index) => playNote(frequency, 0.22, type, gain, index * spacing));
}

export function sfx(name, parameter = 0) {
  if (context === null || muted) return;
  if (name === 'gunshot') {
    hiss(0.15, 0.45 * (parameter || 1), 2500);
    glide(170, 58, 0.11, 0.15, 'square');
  } else if (name === 'explosion') {
    hiss(0.65, 0.75, 820);
    glide(100, 32, 0.6, 0.32, 'sawtooth');
  } else if (name === 'horn') {
    const base = parameter || 340;
    playNote(base, 0.28, 'square', 0.12);
    playNote(base * 1.27, 0.28, 'square', 0.09);
  } else if (name === 'punch') {
    hiss(0.08, 0.3, 660);
    glide(145, 78, 0.08, 0.09, 'triangle');
  } else if (name === 'hit' || name === 'carEnter') {
    playNote(name === 'hit' ? 500 : 380, 0.08, 'square', 0.09);
    playNote(name === 'hit' ? 730 : 540, 0.1, 'sine', 0.07, 0.05);
  } else if (name === 'reload') {
    hiss(0.05, 0.16, 1700);
    playNote(270, 0.07, 'square', 0.06, 0.1);
  } else if (name === 'reloadDone') {
    playNote(600, 0.08, 'square', 0.08);
  } else if (name === 'pickup' || name === 'cash') {
    playNote(650, 0.08, 'sine', 0.11);
    playNote(980, 0.12, 'sine', 0.09, 0.07);
  } else if (name === 'ui') {
    playNote(510, 0.06, 'sine', 0.06);
  } else if (name === 'checkpoint') {
    playNote(710, 0.09, 'triangle', 0.11);
    playNote(1060, 0.13, 'triangle', 0.09, 0.09);
  } else if (name === 'mission') {
    notes([330, 494, 660], 'triangle', 0.1, 0.12);
  } else if (name === 'success') {
    notes([523, 659, 784, 1046], 'sine', 0.1, 0.1);
  } else if (name === 'fail') {
    notes([330, 262, 196], 'triangle', 0.1, 0.12);
  } else if (name === 'wanted') {
    notes([440, 370, 294], 'square', 0.08, 0.11);
  }
}

export function setEngine(speed, active) {
  if (context === null || motor === null) return;
  const when = context.currentTime;
  const magnitude = Math.abs(speed);
  motor.frequency.setTargetAtTime(56 + magnitude * 0.6, when, 0.08);
  motorFilter.frequency.setTargetAtTime(300 + magnitude * 3.2, when, 0.1);
  motorGain.gain.setTargetAtTime(active ? 0.05 + Math.min(0.06, magnitude * 0.00024) : 0, when, 0.12);
}

export function setSiren(active, proximity, phase) {
  if (context === null || siren === null) return;
  const when = context.currentTime;
  siren.frequency.setTargetAtTime(580 + (Math.sin(phase) > 0 ? 200 : 0), when, 0.04);
  sirenGain.gain.setTargetAtTime(active ? 0.032 * proximity : 0, when, 0.1);
}
