export function createMusic(audio) {
  const chords = [
    [220.0, 261.6, 329.6],
    [196.0, 246.9, 293.7],
    [174.6, 220.0, 261.6],
    [164.8, 207.7, 246.9],
  ];
  let timer = 0;
  let beat = 0;

  function step(dt) {
    timer -= dt;
    if (timer > 0) return;
    timer += 0.36;
    if (!audio.ready || audio.muted) return;
    const chord = chords[Math.floor(beat / 8) % chords.length];
    audio.tone(chord[0] / 2, 0.7, 'triangle', 0.045);
    if (beat % 2 === 0) audio.tone(chord[beat % 3], 0.3, 'sine', 0.032);
    if (beat % 8 === 6) audio.tone(chord[2] * 2, 0.18, 'sine', 0.018, 0.18);
    beat += 1;
  }

  function reset() {
    timer = 0;
    beat = 0;
  }

  return { step, reset };
}
