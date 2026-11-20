let audio = null;

function makeNoise(context) {
  const length = Math.floor(context.sampleRate * 0.7);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x2f6e2b1;
  for (let index = 0; index < length; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    data[index] = ((seed >>> 8) / 8388608 - 1) * 0.85;
  }
  return buffer;
}

export function createAudio(world) {
  const state = world.state;
  const self = {
    context: null,
    master: null,
    noise: null,
    engineOsc: null,
    engineGain: null,
    engineFilter: null,
    sirenOsc: null,
    sirenGain: null,
    muted: false,
    siren: false,
    sirenPhase: 0,
    volume: 0.34,
  };

  function ensure() {
    if (self.context) {
      if (self.context.state === 'suspended') self.context.resume().catch(() => {});
      return self.context;
    }
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return null;
    try {
      self.context = new Constructor();
    } catch (error) {
      return null;
    }
    self.master = self.context.createGain();
    self.master.gain.value = self.muted ? 0 : self.volume;
    self.master.connect(self.context.destination);
    self.noise = makeNoise(self.context);
    self.engineOsc = self.context.createOscillator();
    self.engineOsc.type = 'sawtooth';
    self.engineOsc.frequency.value = 55;
    self.engineFilter = self.context.createBiquadFilter();
    self.engineFilter.type = 'lowpass';
    self.engineFilter.frequency.value = 260;
    self.engineGain = self.context.createGain();
    self.engineGain.gain.value = 0;
    self.engineOsc.connect(self.engineFilter);
    self.engineFilter.connect(self.engineGain);
    self.engineGain.connect(self.master);
    self.engineOsc.start();
    self.sirenOsc = self.context.createOscillator();
    self.sirenOsc.type = 'triangle';
    self.sirenOsc.frequency.value = 620;
    self.sirenGain = self.context.createGain();
    self.sirenGain.gain.value = 0;
    self.sirenOsc.connect(self.sirenGain);
    self.sirenGain.connect(self.master);
    self.sirenOsc.start();
    return self.context;
  }

  function wake() {
    ensure();
  }

  function tone(frequency, duration, type, level, sweepTo, delay) {
    const context = ensure();
    if (!context) return;
    const start = context.currentTime + (delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (sweepTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(0.012, duration * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(self.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function hiss(duration, level, cutoff, delay) {
    const context = ensure();
    if (!context || !self.noise) return;
    const start = context.currentTime + (delay || 0);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = self.noise;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff || 1800;
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(self.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  const SOUNDS = {
    shot: () => { hiss(0.13, 0.5, 2600); tone(180, 0.12, 'square', 0.19, 60); },
    punch: () => { hiss(0.09, 0.24, 700); tone(130, 0.08, 'sine', 0.12, 70); },
    hit: () => { tone(220, 0.09, 'triangle', 0.16, 110); },
    explode: () => { hiss(0.75, 0.7, 420); tone(88, 0.6, 'sawtooth', 0.3, 28); },
    crash: () => { hiss(0.28, 0.45, 1100); tone(110, 0.2, 'square', 0.16, 48); },
    horn: () => { tone(392, 0.22, 'square', 0.13); tone(523, 0.22, 'square', 0.11, 0, 0.015); },
    blip: () => { tone(760, 0.07, 'sine', 0.11); tone(1140, 0.06, 'sine', 0.07, 0, 0.05); },
    confirm: () => { tone(523, 0.1, 'triangle', 0.14); tone(784, 0.16, 'triangle', 0.12, 0, 0.09); },
    fail: () => { tone(300, 0.18, 'sawtooth', 0.14, 180); tone(190, 0.26, 'sawtooth', 0.12, 90, 0.13); },
    pickup: () => { tone(880, 0.08, 'sine', 0.12); tone(1320, 0.12, 'sine', 0.1, 0, 0.07); },
    reload: () => { hiss(0.06, 0.14, 3000); hiss(0.08, 0.16, 2200, 0.16); tone(480, 0.05, 'square', 0.07, 360, 0.34); },
    siren: () => { tone(700, 0.12, 'triangle', 0.07, 980); },
    splash: () => { hiss(0.4, 0.3, 900); },
  };

  function play(name) {
    if (self.muted) return;
    const sound = SOUNDS[name];
    if (sound) sound();
  }

  function setEngine(speed, maximum) {
    if (!self.engineGain || !self.context) return;
    const ratio = Math.max(0, Math.min(1, speed / (maximum || 1)));
    const now = self.context.currentTime;
    self.engineOsc.frequency.setTargetAtTime(52 + ratio * 176, now, 0.06);
    self.engineFilter.frequency.setTargetAtTime(220 + ratio * 820, now, 0.08);
    self.engineGain.gain.setTargetAtTime(ratio > 0.01 ? 0.075 + ratio * 0.1 : 0, now, 0.1);
  }

  function setSiren(on, stars) {
    self.siren = Boolean(on);
    self.sirenStars = stars || 0;
  }

  function step(dt) {
    if (!self.context) return;
    self.sirenPhase += dt * (2.4 + (self.sirenStars || 0) * 0.16);
    const wave = Math.sin(self.sirenPhase * Math.PI * 2) > 0 ? 1 : -1;
    const now = self.context.currentTime;
    if (self.siren && !self.muted) {
      self.sirenGain.gain.setTargetAtTime(0.035 + (self.sirenStars || 0) * 0.005, now, 0.08);
      self.sirenOsc.frequency.setTargetAtTime(wave > 0 ? 720 : 490, now, 0.02);
    } else {
      self.sirenGain.gain.setTargetAtTime(0, now, 0.12);
    }
  }

  function setMuted(next) {
    self.muted = Boolean(next);
    if (self.master && self.context) self.master.gain.setTargetAtTime(self.muted ? 0 : self.volume, self.context.currentTime, 0.03);
    state.muted = self.muted;
  }

  function toggleMute() {
    setMuted(!self.muted);
    if (!self.muted) play('blip');
  }

  window.addEventListener('pointerdown', wake);
  window.addEventListener('keydown', wake);
  state.muted = self.muted;
  return { self, ensure, wake, play, tone, hiss, setEngine, setSiren, step, setMuted, toggleMute };
}

let current = null;

export function install(context) {
  current = createAudio(context.world);
  context.systems.audio = current;
}

export function playSound(name) {
  if (current) current.play(name);
}

export function setEngine(speed, maximum) {
  if (current) current.setEngine(speed, maximum);
}

export function setSiren(on, stars) {
  if (current) current.setSiren(on, stars);
}

export function toggleMute() {
  if (current) current.toggleMute();
}

export function audioContext() {
  return current ? current.ensure() : null;
}

export function masterNode() {
  return current ? current.self.master : null;
}

export function isMuted() {
  return current ? current.self.muted : false;
}
