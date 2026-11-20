// A small seeded random number generator (mulberry32): the same seed gives the same game,
// which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function between(random, low, high) {
  return low + random() * (high - low);
}

export function integer(random, low, high) {
  return Math.floor(between(random, low, high + 1));
}

export function choice(random, values) {
  return values[Math.floor(random() * values.length) % values.length];
}

export function chance(random, probability) {
  return random() < probability;
}

/** Mix a seed and two coordinates into a stable 32-bit value, without relying on call order. */
export function hashCell(seed, column, row, salt = 0) {
  let h = (seed | 0) ^ Math.imul(column | 0, 0x9e3779b1) ^ Math.imul(row | 0, 0x85ebca6b) ^ Math.imul(salt | 0, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A fresh generator for one map cell: buildings never change when other cells are generated. */
export function cellRandom(seed, column, row, salt = 0) {
  return createRandom(hashCell(seed, column, row, salt));
}
