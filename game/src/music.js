const PROGRESSION = [
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [55, 59, 62, 66],
  [52, 55, 59, 62],
];

function hz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createMusicSystem(api) {
  const { state } = api;
  let nextTime = 0;
  let beat = 0;

  function voice(frequency, when, duration, volume, type) {
    const audio = state.systems.audio;
    const ctx = audio.context();
    const output = audio.output();
    if (!ctx || !output) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.03);
  }

  function update() {
    const audio = state.systems.audio;
    const ctx = audio.context();
    if (!ctx || ctx.state !== 'running') return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.45) {
      const chord = PROGRESSION[Math.floor(beat / 8) % PROGRESSION.length];
      if (beat % 8 === 0) {
        voice(hz(chord[0] - 24), nextTime, 0.8, 0.075, 'sine');
        for (const note of chord) voice(hz(note), nextTime, 1.5, 0.022, 'triangle');
      }
      if (beat % 2 === 0) voice(hz(chord[0] - 12), nextTime, 0.3, 0.055, 'square');
      voice(hz(chord[beat % 4] + 12), nextTime, 0.16, 0.035, 'triangle');
      if (beat % 8 === 6) voice(hz(chord[2] + 24), nextTime, 0.12, 0.018, 'sine');
      nextTime += 0.19;
      beat += 1;
    }
  }

  function reset() {
    nextTime = 0;
    beat = 0;
  }

  return { update, reset };
}
