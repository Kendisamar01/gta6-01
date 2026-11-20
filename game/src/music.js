import { audioContext, isMuted, masterNode } from './audio.js';

const TEMPO = 96;
const PULSE = 60 / TEMPO / 2;
const ROOT = 110;
const BASS = [0, null, 0, 7, 0, null, 10, 7, -2, null, -2, 5, -2, null, 7, 5];
const CHORDS = [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]];
const ARP = [12, 19, 15, 19, 12, 17, 15, 19];

function frequency(semitones) {
  return ROOT * Math.pow(2, semitones / 12);
}

export function createMusic(world) {
  const self = { index: 0, next: 0, enabled: true, context: null, bus: null };
  world.state.music = self;

  function ensure() {
    const context = audioContext();
    const master = masterNode();
    if (!context || !master) return null;
    if (!self.bus) {
      self.bus = context.createGain();
      self.bus.gain.value = 0.24;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2400;
      self.bus.connect(filter);
      filter.connect(master);
      self.next = context.currentTime + 0.12;
    }
    self.context = context;
    return context;
  }

  function voice(freq, start, duration, type, level, cutoff) {
    const context = self.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(self.bus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function schedule(index, at) {
    const bar = Math.floor(index / 8) % CHORDS.length;
    const chord = CHORDS[bar];
    const bass = BASS[index % BASS.length];
    if (bass !== null) voice(frequency(bass), at, PULSE * 0.85, 'sawtooth', 0.15, 420);
    if (index % 8 === 0) {
      for (let note = 0; note < chord.length; note += 1) {
        voice(frequency(chord[note] + 12), at, PULSE * 6.5, 'triangle', 0.045, 1500);
      }
    }
    if (index % 2 === 0) {
      const arp = ARP[Math.floor(index / 2) % ARP.length];
      voice(frequency(chord[0] + arp), at, PULSE * 0.5, 'square', 0.035, 2600);
    }
    if (index % 4 === 2) voice(58, at, 0.07, 'sine', 0.16, 300);
    if (index % 4 === 0) voice(920, at, 0.035, 'triangle', 0.026, 5000);
  }

  function step() {
    const context = ensure();
    if (!context) return;
    if (isMuted() || !self.enabled) {
      self.next = Math.max(self.next, context.currentTime + 0.05);
      return;
    }
    if (self.next < context.currentTime) self.next = context.currentTime + 0.04;
    let guard = 0;
    while (self.next < context.currentTime + 0.35 && guard < 12) {
      schedule(self.index, self.next);
      self.index = (self.index + 1) % 64;
      self.next += PULSE;
      guard += 1;
    }
  }

  function reset() {
    self.index = 0;
    if (self.context) self.next = self.context.currentTime + 0.1;
  }

  return { self, step, reset, ensure };
}

let current = null;

export function install(context) {
  current = createMusic(context.world);
  context.systems.music = current;
}

export function musicStep() {
  if (current) current.step();
}
