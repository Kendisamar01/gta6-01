// Time-of-day mood. The clock is a fraction of a day; these functions turn it into smooth daylight,
// sky colours and tints. Keeping the colour maths here means the drawing modules only ask simple
// questions such as "how dark is it?" and "what colour is the sky?".
import { VIEW } from './config.js';

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smooth(low, high, value) {
  const t = clamp01((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}

function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function mixColor(a, b, t) {
  return `rgb(${mixChannel(a[0], b[0], t)},${mixChannel(a[1], b[1], t)},${mixChannel(a[2], b[2], t)})`;
}

export function createEnvironment() {
  const state = { clock: 0, daylight: 1, night: 0, dusk: 0 };

  function update(clock) {
    state.clock = clock;
    state.daylight = smooth(0.19, 0.30, clock) * (1 - smooth(0.71, 0.83, clock));
    state.night = 1 - state.daylight;
    state.dusk = Math.max(smooth(0.66, 0.73, clock) * (1 - smooth(0.83, 0.9, clock)), smooth(0.14, 0.2, clock) * (1 - smooth(0.3, 0.36, clock)));
  }

  function skyTop() {
    return mixColor([15, 24, 48], [92, 177, 222], state.daylight);
  }

  function skyBottom() {
    return mixColor([43, 52, 86], [247, 219, 166], state.daylight);
  }

  function water() {
    return mixColor([26, 58, 92], [49, 158, 188], state.daylight);
  }

  function shadowAlpha() {
    return 0.08 + state.daylight * 0.2;
  }

  /** A flat wash applied over the whole frame after the world is drawn. */
  function overlay(context) {
    if (state.night <= 0.01) return;
    context.fillStyle = `rgba(12, 22, 52, ${state.night * 0.36})`;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    if (state.dusk > 0.01) {
      context.fillStyle = `rgba(255, 134, 82, ${state.dusk * 0.09})`;
      context.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  function timeLabel() {
    const minutes = Math.floor(state.clock * 24 * 60) % (24 * 60);
    const hour = Math.floor(minutes / 60);
    const minute = String(minutes % 60).padStart(2, '0');
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${minute} ${suffix}`;
  }

  update(0.33);
  return { state, update, skyTop, skyBottom, water, shadowAlpha, overlay, timeLabel };
}
