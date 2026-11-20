import { DAY } from './config.js';

const TAU = Math.PI * 2;

export function createEnvironment() {
  const state = {
    time: DAY.start * DAY.length,
    phase: DAY.start,
    daylight: 1,
    night: false,
    clock: '08:00',
  };

  function refresh() {
    state.phase = state.time / DAY.length;
    state.daylight = Math.max(0, Math.sin((state.phase - 0.1) * TAU));
    state.night = state.daylight < 0.16;
    const hours = Math.floor(state.phase * 24) % 24;
    const minutes = Math.floor((state.phase * 24 - hours) * 60);
    state.clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function update(dt) {
    state.time = (state.time + dt) % DAY.length;
    refresh();
  }

  function reset() {
    state.time = DAY.start * DAY.length;
    refresh();
  }

  refresh();
  return { state, update, reset };
}
