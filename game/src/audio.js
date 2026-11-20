export function createAudio(world) {
  let context = null;
  let master = null;
  let engineOscillator = null;
  let engineGain = null;
  let sirenOscillator = null;
  let sirenGain = null;
  let muted = false;

  function unlock() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const Constructor = window.AudioContext ?? window.webkitAudioContext;
    if (!Constructor) return;
    context = new Constructor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.34;
    master.connect(context.destination);

    engineOscillator = context.createOscillator();
    engineOscillator.type = 'sawtooth';
    engineOscillator.frequency.value = 60;
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    const engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 520;
    engineOscillator.connect(engineFilter).connect(engineGain).connect(master);
    engineOscillator.start();

    sirenOscillator = context.createOscillator();
    sirenOscillator.type = 'square';
    sirenOscillator.frequency.value = 620;
    sirenGain = context.createGain();
    sirenGain.gain.value = 0;
    sirenOscillator.connect(sirenGain).connect(master);
    sirenOscillator.start();
  }

  function tone(frequency, duration, type = 'sine', volume = 0.3, delay = 0) {
    if (!context || muted) return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function noise(duration, volume = 0.35, cutoff = 1400) {
    if (!context || muted) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) samples[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const envelope = context.createGain();
    envelope.gain.value = volume;
    source.connect(filter).connect(envelope).connect(master);
    source.start();
  }

  function shot() {
    noise(0.12, 0.42, 2600);
    tone(150, 0.08, 'square', 0.16);
  }

  function explosion() {
    noise(0.7, 0.7, 700);
    tone(72, 0.55, 'sawtooth', 0.28);
  }

  function punch() {
    noise(0.07, 0.2, 700);
    tone(110, 0.06, 'triangle', 0.12);
  }

  function blip(pitch = 680) {
    tone(pitch, 0.09, 'square', 0.13);
  }

  function crash() {
    noise(0.22, 0.4, 1100);
    tone(95, 0.16, 'square', 0.16);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.34;
    return muted;
  }

  function step(dt, time) {
    if (!context) return;
    const car = world.state.player.inCar;
    const speed = car ? Math.abs(car.vx ?? car.speed) : 0;
    const target = car ? 55 + Math.min(180, speed * 0.55) : 0;
    engineOscillator.frequency.setTargetAtTime(target, context.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(car ? 0.07 + Math.min(0.09, speed / 2600) : 0, context.currentTime, 0.1);
    const policeActive = world.state.policeCars.some((unit) => unit.siren);
    const sirenPitch = 560 + Math.sin(time * 8) * 190;
    sirenOscillator.frequency.setTargetAtTime(sirenPitch, context.currentTime, 0.04);
    sirenGain.gain.setTargetAtTime(policeActive ? 0.035 : 0, context.currentTime, 0.2);
  }

  return {
    unlock, tone, noise, shot, explosion, punch, blip, crash, toggleMute, step,
    get muted() { return muted; },
    get ready() { return context !== null; },
  };
}
