export function createRandom(seed) {
  let state = seed | 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(random, low, high) {
  return low + (high - low) * random();
}

export function integer(random, low, high) {
  return Math.floor(range(random, low, high + 1));
}

export function pick(random, values) {
  if (values.length === 0) return undefined;
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

export function chance(random, probability) {
  return random() < probability;
}

export function hashSeed(seed, first, second = 0) {
  let value = (seed ^ Math.imul(first + 1, 0x9e3779b1) ^ Math.imul(second + 1, 0x85ebca6b)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function clamp(value, low, high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}
