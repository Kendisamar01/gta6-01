import { FONT, WORLD } from './config.js';
import { solidsNear } from './city.js';
import { ACTION_ENTER } from './input.js';
import { clamp, distance } from './util.js';

const CRIME_WEIGHT = {
  jack: 1,
  police: 1,
  ped: 1,
  car: 1,
  shoot: 1,
  kill: 2,
  hitpolice: 2,
  attack: 1,
};

const CRIME_LABEL = {
  jack: 'Vehicle theft reported',
  police: 'Patrol car stolen',
  ped: 'Pedestrian struck',
  car: 'Reckless driving',
  shoot: 'Shots fired',
  kill: 'Homicide witnessed',
  hitpolice: 'Officer assaulted',
  attack: 'Assault reported',
};

export const WASH_SHOP = {
  x: 3 * WORLD.cell + WORLD.cell / 2,
  y: 8 * WORLD.cell + WORLD.cell / 2,
  cost: 250,
};

export function createWantedSystem(api) {
  const { state } = api;
  let stars = 0;
  let lastCrime = -100;
  let hiddenTime = 0;

  function publish() {
    state.wantedStars = stars;
    state.wanted = Math.floor(stars);
  }

  function add(crime) {
    const gain = CRIME_WEIGHT[crime] || 0;
    if (gain <= 0) return;
    const before = Math.floor(stars);
    stars = clamp(stars + gain, 0, 5);
    lastCrime = state.elapsed;
    hiddenTime = 0;
    publish();
    if (Math.floor(stars) > before) {
      state.systems.toast(`${CRIME_LABEL[crime]} · ${state.wanted} star${state.wanted === 1 ? '' : 's'}`);
      const audio = state.systems && state.systems.audio;
      if (audio) audio.alert();
    }
  }

  function set(value, reason = '') {
    stars = clamp(value, 0, 5);
    lastCrime = state.elapsed;
    hiddenTime = 0;
    publish();
    if (reason) state.systems.toast(reason);
  }

  function clear(reason = '') {
    stars = 0;
    hiddenTime = 0;
    publish();
    if (reason) {
      state.systems.toast(reason);
      const audio = state.systems && state.systems.audio;
      if (audio) audio.ui();
    }
  }

  function tryWash(vehicle, actions) {
    if (!(actions & ACTION_ENTER) || stars <= 0 || !vehicle) return false;
    const player = state.player;
    if (distance(player.x, player.y, WASH_SHOP.x, WASH_SHOP.y) > 92) return false;
    if (player.cash < WASH_SHOP.cost) {
      state.systems.toast(`The garage needs ${WASH_SHOP.cost} to clean your plates.`);
      return true;
    }
    player.cash -= WASH_SHOP.cost;
    vehicle.hp = Math.min(vehicle.maxHp, vehicle.hp + 35);
    clear('Fresh paint. Heat cleared.');
    const fx = state.systems && state.systems.effects;
    if (fx) fx.burst(WASH_SHOP.x, WASH_SHOP.y, '#b7f1ec', 16);
    return true;
  }

  function lineBlocked(ax, ay, bx, by) {
    const steps = Math.ceil(distance(ax, ay, bx, by) / 55);
    const scratch = [];
    for (let index = 1; index < steps; index += 1) {
      const t = index / steps;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      for (const solid of solidsNear(state.city, x, y, 2, scratch)) {
        if (x >= solid.x && x <= solid.x + solid.width && y >= solid.y && y <= solid.y + solid.height) return true;
      }
    }
    return false;
  }

  function step(dt) {
    if (stars <= 0) {
      publish();
      return;
    }
    const player = state.player;
    const gap = state.systems.police.nearestDistance(player.x, player.y);
    const lost = gap > 680 || lineBlocked(player.x, player.y, ...policePoint(state));
    if (lost && state.elapsed - lastCrime > 7) {
      hiddenTime += dt;
      stars = Math.max(0, stars - dt * (gap > 1000 ? 0.14 : 0.075));
    } else {
      hiddenTime = 0;
      const quiet = state.elapsed - lastCrime > 18 && gap > 320;
      if (quiet) stars = Math.max(0, stars - dt * 0.05);
    }
    publish();
  }

  return {
    add,
    set,
    clear,
    step,
    tryWash,
    value() { return stars; },
    hiddenTime() { return hiddenTime; },
  };
}

function policePoint(state) {
  let best = null;
  let bestGap = Infinity;
  for (const unit of state.systems.police.units) {
    if (unit.vehicle.dead) continue;
    const gap = distance(state.player.x, state.player.y, unit.vehicle.x, unit.vehicle.y);
    if (gap < bestGap) {
      bestGap = gap;
      best = unit.vehicle;
    }
  }
  if (best) return [best.x, best.y];
  return [state.player.x + 1000, state.player.y];
}

export function draw(ctx, state) {
  const camera = state.camera.state;
  if (Math.abs(WASH_SHOP.x - camera.x) > 900 || Math.abs(WASH_SHOP.y - camera.y) > 650) return;
  const wanted = state.systems && state.systems.wanted;
  const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 3);
  ctx.fillStyle = '#34414b';
  ctx.fillRect(WASH_SHOP.x - 58, WASH_SHOP.y - 42, 116, 84);
  ctx.fillStyle = '#6fd0c2';
  ctx.fillRect(WASH_SHOP.x - 52, WASH_SHOP.y - 36, 104, 72);
  ctx.fillStyle = '#1d3c43';
  ctx.fillRect(WASH_SHOP.x - 44, WASH_SHOP.y - 28, 88, 8);
  ctx.font = `700 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAINT', WASH_SHOP.x, WASH_SHOP.y + 2);
  ctx.fillText('$250', WASH_SHOP.x, WASH_SHOP.y + 19);
  if (wanted && wanted.value() > 0) {
    ctx.strokeStyle = `rgba(121, 234, 219, ${(0.45 + pulse * 0.45).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(WASH_SHOP.x, WASH_SHOP.y, 62 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}
