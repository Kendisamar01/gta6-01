import { audioReady, playNote } from './audio.js';

const PROGRESSION = [
  [110, 164.81, 220, 261.63],
  [87.31, 130.81, 174.61, 220],
  [130.81, 196, 261.63, 329.63],
  [98, 146.83, 196, 246.94],
];

const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

export function createMusic() {
  return { timer: 0, step: 0, bar: 0 };
}

export function updateMusic(music, dt, timeOfDay) {
  if (!audioReady()) return;
  music.timer -= dt;
  if (music.timer > 0) return;
  music.timer += 0.29;

  const step = music.step % 16;
  const bar = Math.floor(music.step / 16) % PROGRESSION.length;
  const chord = PROGRESSION[bar];
  const night = timeOfDay < 0.22 || timeOfDay > 0.78;

  if (step % 4 === 0) playNote(chord[0], 0.38, 'triangle', night ? 0.055 : 0.045);
  if (step === 0) {
    for (let i = 1; i < chord.length; i += 1) playNote(chord[i], 1.6, 'sine', 0.018);
  }
  if (step % 2 === 1) {
    const note = chord[ARP[(step - 1) / 2] % ARP.length] * 2;
    playNote(note, 0.18, 'square', night ? 0.014 : 0.02);
  }
  if (night && step === 8) playNote(chord[2] * 4, 0.5, 'sine', 0.012);
  music.step += 1;
  music.bar = bar;
}
