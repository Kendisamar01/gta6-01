import { getContext } from './audio.js';
import { radioLine } from './story.js';

let nextBeat = 0;
let step = 0;
let radioClock = 0;

export function init() {
  getContext();
  nextBeat = 0;
  step = 0;
  radioClock = 0;
}

function note(frequency, duration, type, volume, time) {
  const context = getContext();
  if (!context || context.state !== 'running') return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

const BASS = [55, 55, 65.41, 55, 49, 49, 73.42, 65.41];
const LEAD = [440, 0, 523.25, 0, 587.33, 0, 523.25, 392];

export function update(world, dt) {
  const context = getContext();
  if (!context || context.state !== 'running' || world.muted) return;
  if (nextBeat < context.currentTime) nextBeat = context.currentTime + 0.05;
  while (nextBeat < context.currentTime + 0.25) {
    const slot = step % 8;
    note(BASS[slot], 0.24, 'triangle', 0.045, nextBeat);
    if (LEAD[slot]) note(LEAD[slot], 0.18, 'sine', 0.022, nextBeat + 0.02);
    if (slot % 2 === 0) note(1200, 0.035, 'square', 0.008, nextBeat + 0.16);
    nextBeat += 0.3;
    step += 1;
  }
  radioClock += dt;
  if (radioClock > 52) {
    radioClock = 0;
    if (world.random() > 0.4) world.notices.push({ text: radioLine(world.random), kind: 'radio', life: 4, max: 4 });
  }
}
