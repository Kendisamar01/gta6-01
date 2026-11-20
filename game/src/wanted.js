import { WANTED_THRESHOLDS } from './config.js';
import { shopAt } from './city.js';
import { clamp } from './random.js';

export function createWanted() {
  return {
    level: 0,
    heat: 0,
    hideTimer: 0,
    flash: 0,
    sprayCooldown: 0,
    lastCrime: '',
  };
}

function heatLevel(heat) {
  let result = 0;
  for (let level = 1; level < WANTED_THRESHOLDS.length; level += 1) {
    if (heat >= WANTED_THRESHOLDS[level]) result = level;
  }
  return result;
}

function cruiserNearby(world, radius) {
  for (const car of world.vehicles) {
    if (!car.alive || car.driver?.type !== 'police') continue;
    if (Math.hypot(car.x - world.player.x, car.y - world.player.y) < radius) return true;
  }
  return false;
}

export function reportCrime(world, amount, label = '') {
  const previous = world.wanted.level;
  world.wanted.heat = Math.min(WANTED_THRESHOLDS[5] + 140, world.wanted.heat + amount);
  const next = heatLevel(world.wanted.heat);
  world.wanted.lastCrime = label;
  world.wanted.flash = Math.max(world.wanted.flash, next > previous ? 0.95 : 0.42);
  world.wanted.level = next;
  if (next > previous) {
    world.toast(`${next} star${next === 1 ? '' : 's'} — ${label || 'wanted'}`);
    world.sfx('wanted', next);
  }
}

export function setWantedLevel(world, level, reason = '') {
  const stars = clamp(Math.round(level), 0, 5);
  world.wanted.level = stars;
  world.wanted.heat = WANTED_THRESHOLDS[stars] + (stars > 0 ? 1 : 0);
  world.wanted.lastCrime = reason;
  world.wanted.flash = 0.95;
  if (stars > 0) world.toast(`${stars} star${stars === 1 ? '' : 's'} — ${reason || 'wanted'}`);
}

export function clearWanted(world, reason = 'Heat lost') {
  if (world.wanted.level > 0) world.toast(reason);
  world.wanted.level = 0;
  world.wanted.heat = 0;
  world.wanted.hideTimer = 0;
}

export function updateWanted(world, dt) {
  const heat = world.wanted;
  heat.flash = Math.max(0, heat.flash - dt * 1.7);
  heat.sprayCooldown = Math.max(0, heat.sprayCooldown - dt);

  if (heat.level === 0) {
    heat.heat = Math.max(0, heat.heat - dt * 9);
    return;
  }

  if (cruiserNearby(world, 520)) {
    heat.hideTimer = 0;
    return;
  }

  heat.hideTimer += dt;
  if (heat.hideTimer <= 9) return;

  const floor = WANTED_THRESHOLDS[heat.level - 1] - 1;
  heat.heat = Math.max(floor, heat.heat - dt * 30);
  const next = heatLevel(heat.heat);
  if (next < heat.level) {
    heat.level = next;
    world.toast(next === 0 ? 'You lost the cops' : `${next} star${next === 1 ? '' : 's'} remaining`);
    if (next === 0) heat.hideTimer = 0;
  }
}

export function tryPayNSpray(world) {
  const garage = shopAt(world.city, 'spray');
  if (garage === null) return false;
  if (Math.hypot(garage.x - world.player.x, garage.y - world.player.y) > 110) return false;
  if (world.wanted.sprayCooldown > 0) {
    world.toast('Paint is still drying');
    return false;
  }
  if (world.player.money < 240) {
    world.toast('Need $240 for a fresh coat');
    return false;
  }
  if (world.wanted.level === 0) {
    world.toast('No heat to lose');
    return false;
  }

  world.player.money -= 240;
  clearWanted(world, 'Fresh paint, clean slate');
  world.wanted.sprayCooldown = 20;
  world.sfx('cash');
  for (const car of world.vehicles) {
    if (car.driver?.type === 'police' && car.ai) car.ai.despawn = 2;
  }
  return true;
}

export function wantedStars(world) {
  return world.wanted.level;
}
