import { STAR_STEPS } from './config.js';
import { shopByKind } from './city.js';
import { limit } from './random.js';

export function makeWanted() {
  return {
    stars: 0,
    heat: 0,
    hiddenFor: 0,
    alert: 0,
    paintClock: 0,
    reason: '',
  };
}

function starsFor(heat) {
  let result = 0;
  for (let level = 1; level < STAR_STEPS.length; level += 1) {
    if (heat >= STAR_STEPS[level]) result = level;
  }
  return result;
}

function cruiserClose(world, radius) {
  for (const car of world.vehicles) {
    if (!car.alive || car.driver?.type !== 'officer') continue;
    if (Math.hypot(car.x - world.player.x, car.y - world.player.y) < radius) return true;
  }
  return false;
}

export function reportCrime(world, amount, label = '') {
  const before = world.wanted.stars;
  world.wanted.heat = Math.min(STAR_STEPS[5] + 140, world.wanted.heat + amount);
  const after = starsFor(world.wanted.heat);
  world.wanted.reason = label;
  world.wanted.alert = Math.max(world.wanted.alert, after > before ? 0.95 : 0.42);
  world.wanted.stars = after;
  if (after > before) {
    world.notify(`${after} star${after === 1 ? '' : 's'} — ${label || 'wanted'}`);
    world.sound('wanted', after);
  }
}

export function forceStars(world, level, reason = '') {
  const stars = limit(Math.round(level), 0, 5);
  world.wanted.stars = stars;
  world.wanted.heat = STAR_STEPS[stars] + (stars > 0 ? 1 : 0);
  world.wanted.reason = reason;
  world.wanted.alert = 0.95;
  if (stars > 0) world.notify(`${stars} star${stars === 1 ? '' : 's'} — ${reason || 'wanted'}`);
}

export function clearHeat(world, reason = 'Heat lost') {
  if (world.wanted.stars > 0) world.notify(reason);
  world.wanted.stars = 0;
  world.wanted.heat = 0;
  world.wanted.hiddenFor = 0;
}

export function coolWanted(world, dt) {
  const heat = world.wanted;
  heat.alert = Math.max(0, heat.alert - dt * 1.7);
  heat.paintClock = Math.max(0, heat.paintClock - dt);

  if (heat.stars === 0) {
    heat.heat = Math.max(0, heat.heat - dt * 9);
    return;
  }

  if (cruiserClose(world, 520)) {
    heat.hiddenFor = 0;
    return;
  }

  heat.hiddenFor += dt;
  if (heat.hiddenFor <= 9) return;

  const floor = STAR_STEPS[heat.stars - 1] - 1;
  heat.heat = Math.max(floor, heat.heat - dt * 30);
  const next = starsFor(heat.heat);
  if (next < heat.stars) {
    heat.stars = next;
    world.notify(next === 0 ? 'You lost the cops' : `${next} star${next === 1 ? '' : 's'} remaining`);
    if (next === 0) heat.hiddenFor = 0;
  }
}

export function buyPaintJob(world) {
  const shop = shopByKind(world.city, 'spray');
  if (shop === null) return false;
  if (Math.hypot(shop.x - world.player.x, shop.y - world.player.y) > 110) return false;
  if (world.wanted.paintClock > 0) {
    world.notify('Paint is still drying');
    return false;
  }
  if (world.player.money < 240) {
    world.notify('Need $240 for a fresh coat');
    return false;
  }
  if (world.wanted.stars === 0) {
    world.notify('No heat to lose');
    return false;
  }

  world.player.money -= 240;
  clearHeat(world, 'Fresh paint, clean slate');
  world.wanted.paintClock = 20;
  world.sound('cash');
  for (const car of world.vehicles) {
    if (car.driver?.type === 'officer' && car.route) car.route.retire = 2;
  }
  return true;
}

export function starCount(world) {
  return world.wanted.stars;
}
