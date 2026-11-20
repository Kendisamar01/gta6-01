// The game's rules and state, with no drawing and no browser in it: the player's paddle, the
// pool of falling blocks and coins, spawning, collisions, score, lives and level. step() advances
// one fixed step and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after createWorld returns.
import { BLOCK, COIN, FIELD, LEVEL, LIVES, PLAYER, POOL_SIZE } from './config.js';

export const KIND_BLOCK = 0;
export const KIND_COIN = 1;

export const EVENT_HIT = 1;
export const EVENT_COIN = 2;
export const EVENT_OVER = 4;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = { x: 0, y: FIELD.groundY - PLAYER.height, width: PLAYER.width, height: PLAYER.height, invulnerable: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_BLOCK, x: 0, y: 0, width: 0, height: 0, speed: 0 });
  }
  const state = { player, items, score: 0, lives: LIVES, level: 1, elapsed: 0, blockTimer: 0, coinTimer: 0 };

  function reset() {
    player.x = (FIELD.width - player.width) / 2;
    player.invulnerable = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.blockTimer = BLOCK.interval;
    state.coinTimer = COIN.interval;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawnBlock() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_BLOCK;
    item.width = BLOCK.minWidth + random() * (BLOCK.maxWidth - BLOCK.minWidth);
    item.height = BLOCK.height;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = BLOCK.speed + BLOCK.speedPerLevel * (state.level - 1) + random() * BLOCK.speedJitter;
  }

  function spawnCoin() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_COIN;
    item.width = COIN.size;
    item.height = COIN.size;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = COIN.speed + COIN.speedPerLevel * (state.level - 1);
  }

  function blockInterval() {
    return Math.max(BLOCK.minInterval, BLOCK.interval * BLOCK.intervalScale ** (state.level - 1));
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right). With `harmless` set (the title
   * screen's backdrop) things fall but nothing touches the player and nothing scores.
   */
  function step(dt, direction, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));

    player.x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    state.blockTimer -= dt;
    if (state.blockTimer <= 0) {
      spawnBlock();
      state.blockTimer += blockInterval();
    }
    state.coinTimer -= dt;
    if (state.coinTimer <= 0) {
      spawnCoin();
      state.coinTimer += COIN.interval + random() * COIN.intervalJitter;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      if (item.y > FIELD.groundY) {
        item.active = false;
        if (item.kind === KIND_BLOCK && !harmless) state.score += BLOCK.dodgePoints;
        continue;
      }
      if (harmless || !overlaps(item, player)) continue;
      if (item.kind === KIND_COIN) {
        item.active = false;
        state.score += COIN.points;
        events |= EVENT_COIN;
      } else if (player.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        player.invulnerable = PLAYER.invulnerable;
        events |= EVENT_HIT;
        if (state.lives === 0) {
          events |= EVENT_OVER;
          break;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}

import { CITY, FOOT, HOURS_PER_SECOND, SCREENS } from './config.js';
import { createRandom } from './random.js';
import { blockedAt, districtAt, generateCity, moveWithCollision } from './city.js';

export function createSolaraWorld(seed) {
  const city = generateCity(seed);
  const startX = 6 * CITY.cell + CITY.road / 2;
  const startY = 7 * CITY.cell + CITY.road / 2;
  const player = {
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: FOOT.radius,
    health: 100,
    armor: 0,
    money: FOOT.money,
    respect: 0,
    weapon: 'fists',
    ammo: 0,
    reserve: 0,
    invulnerable: 0,
    fireCooldown: 0,
    reload: 0,
    swing: 0,
    walking: false,
    running: false,
    inVehicle: null,
    aimX: startX,
    aimY: startY - 100,
    skin: 2,
  };
  return {
    seed,
    random: createRandom(seed ^ 0x71f3a),
    city,
    player,
    vehicles: [],
    peds: [],
    bullets: [],
    effects: [],
    skids: [],
    pickups: [],
    systems: {},
    time: 9.5,
    elapsed: 0,
    area: districtAt(startX, startY),
    wanted: 0,
    heat: 0,
    crimeTimer: 0,
    hiddenTimer: 0,
    screen: SCREENS.title,
    menuIndex: 0,
    notices: [],
    events: [],
    stats: { kills: 0, crashes: 0, fares: 0, deliveries: 0, missionWins: 0 },
    mission: {
      index: 0,
      active: null,
      stage: 0,
      completed: [],
      timer: 0,
      text: '',
      dialogue: null,
      target: null,
      reward: 0,
      failed: false,
    },
    side: { taxi: null, rampage: 0, delivery: 0, deliveryIndex: 0, cooldown: 0 },
    intro: 0,
    flash: 0,
    muted: false,
  };
}

export function notify(world, text, kind = 'info') {
  world.notices.push({ text, kind, life: 4.2, max: 4.2 });
  if (world.notices.length > 5) world.notices.shift();
  world.events.push({ type: 'notice', kind });
}

export function formatClock(world) {
  const hour = Math.floor(world.time) % 24;
  const minute = Math.floor((world.time - Math.floor(world.time)) * 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isNight(world) {
  return world.time < 6.2 || world.time > 18.8;
}

export function stepEnvironment(world, dt) {
  world.elapsed += dt;
  world.time = (world.time + dt * HOURS_PER_SECOND) % 24;
  const area = districtAt(world.player.x, world.player.y);
  if (area !== world.area) {
    world.area = area;
    world.events.push({ type: 'area', area });
    notify(world, area);
  }
  for (let index = world.notices.length - 1; index >= 0; index -= 1) {
    world.notices[index].life -= dt;
    if (world.notices[index].life <= 0) world.notices.splice(index, 1);
  }
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 3);
  if (world.intro < 1) world.intro = Math.min(1, world.intro + dt * 0.6);
}

export function moveActor(world, actor, dx, dy, radius) {
  moveWithCollision(world.city, actor, dx, dy, radius);
}

export function stepPlayer(world, controls, dt) {
  const player = world.player;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.reload = Math.max(0, player.reload - dt);
  player.swing = Math.max(0, player.swing - dt * 4);
  if (player.inVehicle !== null) return;
  const mx = controls.mx || 0;
  const my = controls.my || 0;
  const length = Math.hypot(mx, my);
  player.running = Boolean(controls.run) && length > 0.1;
  const speed = player.running ? FOOT.run : FOOT.walk;
  if (length > 0.1) {
    const nx = mx / length;
    const ny = my / length;
    moveActor(world, player, nx * speed * dt, ny * speed * dt, player.radius);
    player.walking = true;
  } else {
    player.walking = false;
  }
  player.vx = length > 0.1 ? (mx / length) * speed : 0;
  player.vy = length > 0.1 ? (my / length) * speed : 0;
  if (controls.aimX !== undefined) {
    player.aimX = controls.aimX;
    player.aimY = controls.aimY;
    const dx = player.aimX - player.x;
    const dy = player.aimY - player.y;
    if (dx * dx + dy * dy > 25) player.angle = Math.atan2(dy, dx);
  }
  if (controls.fire && player.swing === 0) player.swing = 1;
}

export function damagePlayer(world, amount, cause = 'injury') {
  const player = world.player;
  if (player.invulnerable > 0 || world.screen !== SCREENS.play) return;
  let remaining = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, remaining * 0.65);
    player.armor -= absorbed;
    remaining -= absorbed;
  }
  player.health -= remaining;
  player.invulnerable = 0.55;
  world.flash = 0.5;
  world.events.push({ type: 'hurt', cause, amount });
  if (player.health <= 0) {
    player.health = 0;
    world.screen = SCREENS.wasted;
    world.events.push({ type: 'wasted' });
  }
}

export function bustPlayer(world) {
  if (world.screen !== SCREENS.play) return;
  world.player.health = Math.max(35, world.player.health);
  world.screen = SCREENS.busted;
  world.events.push({ type: 'busted' });
}

export function respawn(world, keepWanted = false) {
  const hospital = world.city.landmarks.find((place) => place.type === 'hospital');
  const spot = hospital || { x: 6 * CITY.cell, y: 7 * CITY.cell };
  world.player.x = spot.x + 90;
  world.player.y = spot.y + 40;
  world.player.vx = 0;
  world.player.vy = 0;
  world.player.health = 100;
  world.player.armor = Math.max(0, world.player.armor - 25);
  world.player.invulnerable = 2.5;
  world.player.inVehicle = null;
  if (!keepWanted) {
    world.wanted = 0;
    world.heat = 0;
  }
  world.screen = SCREENS.play;
  world.events.push({ type: 'respawn' });
}

export function pointBlocked(world, x, y, radius = 4) {
  return blockedAt(world.city, x, y, radius);
}

import * as vehicleSystem from './vehicles.js';
import * as trafficSystem from './traffic.js';
import * as pedSystem from './peds.js';
import * as policeSystem from './police.js';
import * as wantedSystem from './wanted.js';
import * as combatSystem from './combat.js';
import * as missionSystem from './missions.js';
import * as storySystem from './story.js';
import * as effectSystem from './effects.js';
import * as audioSystem from './audio.js';
import * as musicSystem from './music.js';
import * as minimapSystem from './minimap.js';
import * as hudSystem from './hud.js';
import * as menuSystem from './menu.js';
import * as saveSystem from './save.js';

export function bindSolaraSystems(world, systems) {
  Object.assign(systems, {
    vehicles: vehicleSystem,
    traffic: trafficSystem,
    peds: pedSystem,
    police: policeSystem,
    wanted: wantedSystem,
    combat: combatSystem,
    missions: missionSystem,
    story: storySystem,
    effects: effectSystem,
    audio: audioSystem,
    music: musicSystem,
    minimap: minimapSystem,
    hud: hudSystem,
    menu: menuSystem,
    save: saveSystem,
  });
  world.systems = systems;
  return systems;
}
