import { audioReady, playNote } from './audio.js';

const CHORDS = [
  [98, 146.83, 196, 233.08],
  [82.41, 123.47, 164.81, 196],
  [116.54, 174.61, 233.08, 277.18],
  [87.31, 130.81, 174.61, 220],
];
const PATTERN = [0, 2, 3, 1, 2, 0, 3, 1];

export function createMusic() {
  return { clock: 0, beat: 0, phrase: 0 };
}

export function updateMusic(music, dt, dayClock) {
  if (!audioReady()) return;
  music.clock -= dt;
  if (music.clock > 0) return;
  music.clock += 0.31;

  const step = music.beat % 16;
  const phrase = Math.floor(music.beat / 16) % CHORDS.length;
  const chord = CHORDS[phrase];
  const evening = dayClock < 0.22 || dayClock > 0.78;

  if (step % 4 === 0) playNote(chord[0], 0.36, 'triangle', evening ? 0.05 : 0.042);
  if (step === 0) {
    for (let i = 1; i < chord.length; i += 1) playNote(chord[i], 1.5, 'sine', 0.017);
  }
  if (step % 2 === 1) {
    const voice = chord[PATTERN[(step - 1) / 2]] * 2;
    playNote(voice, 0.17, 'square', evening ? 0.013 : 0.019);
  }
  if (evening && step === 12) playNote(chord[2] * 4, 0.42, 'sine', 0.011);
  music.beat += 1;
  music.phrase = phrase;
}
