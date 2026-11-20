export function createRandom(seed) {
  let state = (seed >>> 0) ^ 0x9e3779b9;
  if (state === 0) state = 0x6d3f1a2b;

  function next() {
    state ^= (state << 13) >>> 0;
    state ^= state >>> 17;
    state ^= (state << 5) >>> 0;
    return (state >>> 0) / 4294967296;
  }

  next.range = (low, high) => low + next() * (high - low);
  next.integer = (low, high) => Math.floor(low + next() * (high - low + 1));
  next.chance = (probability) => next() < probability;
  next.pick = (items) => items[Math.floor(next() * items.length) % items.length];
  return next;
}

export function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = items[index];
    items[index] = items[other];
    items[other] = held;
  }
  return items;
}
