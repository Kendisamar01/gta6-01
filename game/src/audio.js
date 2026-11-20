import { clamp } from './util.js';

let active = null;

export function createAudioSystem(api) {
  const { state, rng } = api;
  let ctx = null;
  let master = null;
  let engine = null;
  let engineGain = null;
  let siren = null;
  let sirenGain = null;
  let muted = false;
  let lastHorn = -10;

  function ensure() {
    if (ctx) return ctx;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return null;
    ctx = new Constructor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.34;
    master.connect(ctx.destination);
    return ctx;
  }

  function resume() {
    const audio = ensure();
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function tone(frequency, duration, type = 'sine', volume = 0.15, endFrequency = 0) {
    const audio = ensure();
    if (!audio || !master || audio.state !== 'running') return;
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function noise(duration, volume, cutoff) {
    const audio = ensure();
    if (!audio || !master || audio.state !== 'running') return;
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = rng() * 2 - 1;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = audio.createGain();
    const now = audio.currentTime;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  function gunshot(level = 1) {
    noise(0.12, 0.34 * level, 2200);
    tone(150, 0.09, 'square', 0.12 * level, 55);
  }

  function explosion() {
    noise(0.65, 0.55, 760);
    tone(92, 0.55, 'sawtooth', 0.28, 32);
  }

  function crash(strength) {
    noise(0.13, clamp(strength / 130, 0.05, 0.32), 1100);
  }

  function horn() {
    if (state.elapsed - lastHorn < 0.55) return;
    lastHorn = state.elapsed;
    tone(320, 0.2, 'square', 0.13);
    tone(405, 0.2, 'square', 0.1);
  }

  function ui() {
    tone(680, 0.07, 'triangle', 0.1);
  }

  function alert() {
    tone(880, 0.12, 'sine', 0.14);
    tone(1180, 0.16, 'sine', 0.1);
  }

  function pickup() {
    tone(520, 0.1, 'triangle', 0.12);
    tone(790, 0.13, 'triangle', 0.1);
  }

  function punch() {
    noise(0.06, 0.14, 640);
  }

  function reload() {
    tone(250, 0.05, 'square', 0.08, 180);
  }

  function hurt() {
    tone(190, 0.18, 'sawtooth', 0.13, 80);
  }

  function update() {
    const audio = ensure();
    if (!audio || !master || audio.state !== 'running') return;
    const now = audio.currentTime;
    const car = state.systems.vehicles.playerVehicle();
    const speed = car ? Math.abs(car.speed) : 0;
    if (car && !engine) {
      engine = audio.createOscillator();
      engineGain = audio.createGain();
      engine.type = 'sawtooth';
      engineGain.gain.value = 0;
      engine.connect(engineGain);
      engineGain.connect(master);
      engine.start();
    }
    if (engine && engineGain) {
      engine.frequency.setTargetAtTime(52 + speed * 1.15, now, 0.08);
      engineGain.gain.setTargetAtTime(car ? 0.025 + Math.min(0.1, speed / 2600) : 0, now, 0.12);
    }
    const wanted = state.wantedStars > 0;
    if (wanted && !siren) {
      siren = audio.createOscillator();
      sirenGain = audio.createGain();
      siren.type = 'triangle';
      sirenGain.gain.value = 0;
      siren.connect(sirenGain);
      sirenGain.connect(master);
      siren.start();
    }
    if (siren && sirenGain) {
      siren.frequency.setTargetAtTime(Math.floor(state.elapsed * 2.4) % 2 === 0 ? 720 : 520, now, 0.04);
      sirenGain.gain.setTargetAtTime(wanted ? 0.055 : 0, now, 0.1);
    }
  }

  function toggle() {
    muted = !muted;
    const audio = ensure();
    if (audio && master) master.gain.setTargetAtTime(muted ? 0 : 0.34, audio.currentTime, 0.05);
    return muted;
  }

  function reset() {
    muted = false;
    lastHorn = -10;
  }

  active = {
    resume,
    toggle,
    reset,
    update,
    gunshot,
    explosion,
    crash,
    horn,
    ui,
    alert,
    pickup,
    punch,
    reload,
    hurt,
    context: ensure,
    output() { return master; },
    isMuted() { return muted; },
  };
  return active;
}

export function resumeAudio() {
  if (active) active.resume();
}

export function toggle() {
  return active ? active.toggle() : false;
}

export function resume() {
  resumeAudio();
}
