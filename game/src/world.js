// Rules and state only: the city layout, one person on foot, the clock and the small set of facts
// the rest of the game shares. There is no canvas here; step() takes a control snapshot and returns
// event bits so the loop can announce or react to what just happened.
import { CITY, DAY_LENGTH, DAY_START, FOOT } from './config.js';
import { createRandom } from './random.js';
import { cellAt, createCity, districtAt, isSolid, streetAt } from './city.js';

export const EVENT_AREA_CHANGE = 1;
export const EVENT_WASTED = 2;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function colliding(city, x, y, radius) {
  return isSolid(city, x - radius, y - radius) || isSolid(city, x + radius, y - radius)
    || isSolid(city, x - radius, y + radius) || isSolid(city, x + radius, y + radius);
}

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createWorld(seed) {
  const city = createCity(seed);
  const random = createRandom(seed ^ 0x5f3759df);
  const player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: FOOT.radius,
    angle: -Math.PI / 2,
    speed: 0,
    health: FOOT.health,
    armor: FOOT.armor,
    money: FOOT.money,
    weapon: 'fists',
    ammo: 0,
    wanted: 0,
  };
  const state = {
    seed,
    city,
    player,
    random,
    elapsed: 0,
    clock: DAY_START,
    area: 'Downtown',
    street: 'Almond Avenue',
    message: '',
    wasted: false,
    vehicles: null,
    peds: null,
    mission: null,
  };

  function reset() {
    player.x = 16 * CITY.cell;
    player.y = 10 * CITY.cell;
    player.vx = 0;
    player.vy = 0;
    player.angle = -Math.PI / 2;
    player.health = FOOT.health;
    player.armor = FOOT.armor;
    player.wanted = 0;
    player.wasted = false;
    state.elapsed = 0;
    state.clock = DAY_START;
    state.area = districtAt(city, player.x, player.y);
    state.street = streetAt(city, player.x, player.y);
    state.message = '';
    state.wasted = false;
  }
  if (state.gameplay && state.gameplay.reset) state.gameplay.reset();

  function teleport(x, y) {
    player.x = clamp(x, player.radius, city.size - player.radius);
    player.y = clamp(y, player.radius, city.size - player.radius);
    player.vx = 0;
    player.vy = 0;
    state.area = districtAt(city, player.x, player.y);
    state.street = streetAt(city, player.x, player.y);
  }

  function damage(amount) {
    if (player.wasted || amount <= 0) return;
    if (state.gameplay && state.gameplay.onDamage) state.gameplay.onDamage(amount);
    let left = amount;
    if (player.armor > 0) {
      const absorbed = Math.min(player.armor, left);
      player.armor -= absorbed;
      left -= absorbed;
    }
    player.health = Math.max(0, player.health - left);
    if (player.health === 0) {
      player.wasted = true;
      state.wasted = true;
    }
  }

  /** Move one axis in short hops so a fast player never tunnels through a thin wall. */
  function advance(axis, distance) {
    if (distance === 0) return;
    const hops = Math.max(1, Math.ceil(Math.abs(distance) / 6));
    const step = distance / hops;
    for (let index = 0; index < hops; index += 1) {
      const nx = axis === 'x' ? player.x + step : player.x;
      const ny = axis === 'y' ? player.y + step : player.y;
      if (colliding(city, nx, ny, player.radius)) break;
      player.x = nx;
      player.y = ny;
    }
  }

  function step(dt, control) {
    let events = 0;
    state.elapsed += dt;
    state.clock = (DAY_START + state.elapsed / DAY_LENGTH) % 1;
    if (state.gameplay && state.gameplay.beforeStep) state.gameplay.beforeStep(dt, control);

    if (player.wasted) return EVENT_WASTED;

    let ix = control.x || 0;
    let iy = control.y || 0;
    const magnitude = Math.hypot(ix, iy);
    if (magnitude > 1) {
      ix /= magnitude;
      iy /= magnitude;
    }
    const top = control.run ? FOOT.runSpeed : FOOT.speed;
    const blend = Math.min(1, (magnitude > 0 ? FOOT.accel : FOOT.drag) * dt);
    player.vx += (ix * top - player.vx) * blend;
    player.vy += (iy * top - player.vy) * blend;
    advance('x', player.vx * dt);
    advance('y', player.vy * dt);
    player.x = clamp(player.x, player.radius, city.size - player.radius);
    player.y = clamp(player.y, player.radius, city.size - player.radius);
    player.speed = Math.hypot(player.vx, player.vy);

    if (control.aimX !== undefined && control.aimY !== undefined) {
      const dx = control.aimX - player.x;
      const dy = control.aimY - player.y;
      if (dx * dx + dy * dy > 4) player.angle = Math.atan2(dy, dx);
    } else if (player.speed > 4) {
      player.angle = Math.atan2(player.vy, player.vx);
    }

    if (state.gameplay && state.gameplay.step) state.gameplay.step(dt, control);
    const area = districtAt(city, player.x, player.y);
    const street = streetAt(city, player.x, player.y);
    if (area !== state.area || street !== state.street) {
      state.area = area;
      state.street = street;
      events |= EVENT_AREA_CHANGE;
    }
    const here = cellAt(city, player.x, player.y);
    if (here && here.terrain === 'sand') player.speed *= 0.72;
    return events;
  }

  reset();
  return { state, city, player, reset, teleport, damage, step, isSolid, overlaps };
}
