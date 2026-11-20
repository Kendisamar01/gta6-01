export function makeRandom(seed) {
  let state = (seed >>> 0) || 0x51f0a2c3;
  return function next() {
    state = (state + 0x9e3779b9) | 0;
    let mixed = (state ^ (state >>> 16)) >>> 0;
    mixed = Math.imul(mixed, 0x21f0aaad);
    mixed = (mixed ^ (mixed >>> 15)) >>> 0;
    mixed = Math.imul(mixed, 0x735a2d97);
    return ((mixed ^ (mixed >>> 15)) >>> 0) / 4294967296;
  };
}

export function between(rng, low, high) {
  return low + (high - low) * rng();
}

export function whole(rng, low, high) {
  return Math.floor(between(rng, low, high + 1));
}

export function choose(rng, items) {
  if (items.length === 0) return undefined;
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

export function odds(rng, chance) {
  return rng() < chance;
}

export function mixSeed(seed, first, second = 0) {
  let value = (seed ^ Math.imul(first + 17, 0x9e3779b1) ^ Math.imul(second + 31, 0x85ebca6b)) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function limit(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function gap(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function blend(from, to, share) {
  return from + (to - from) * share;
}

export function bearingDifference(target, current) {
  return ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}
