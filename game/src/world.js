// The game's rules and state, with no drawing and no browser in it: the player's paddle, the
// pool of falling blocks and coins, spawning, collisions, score, lives and level. step() advances
// one fixed step and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after createWorld returns.
import { WALKER } from './config.js';
import { createCity, clampWorld, districtAt, solidsNear } from './city.js';
import { createCamera } from './camera.js';
import { createEnvironment } from './environment.js';
import { createRandom } from './random.js';
import { createEffectSystem } from './effects.js';
import { createVehicleSystem } from './vehicles.js';
import { createTrafficSystem } from './traffic.js';
import { createPedSystem } from './peds.js';
import { createPoliceSystem } from './police.js';
import { createWantedSystem } from './wanted.js';
import { createCombatSystem } from './combat.js';
import { createMissionSystem } from './missions.js';
import { createAudioSystem } from './audio.js';
import { createMusicSystem } from './music.js';

export const KIND_BLOCK = 0;
export const KIND_COIN = 1;

export const EVENT_HIT = 1;
export const EVENT_COIN = 2;
export const EVENT_OVER = 4;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

const scratch = [];

function hitsBuilding(city, x, y, radius) {
  const solids = solidsNear(city, x, y, radius, scratch);
  for (let index = 0; index < solids.length; index += 1) {
    const solid = solids[index];
    const nearestX = Math.min(solid.x + solid.width, Math.max(solid.x, x));
    const nearestY = Math.min(solid.y + solid.height, Math.max(solid.y, y));
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

function moveWalker(city, player, dx, dy) {
  if (dx !== 0) {
    const spot = clampWorld(city, player.x + dx, player.y, player.radius);
    if (!hitsBuilding(city, spot.x, player.y, player.radius)) player.x = spot.x;
    else player.vx = 0;
  }
  if (dy !== 0) {
    const spot = clampWorld(city, player.x, player.y + dy, player.radius);
    if (!hitsBuilding(city, player.x, spot.y, player.radius)) player.y = spot.y;
    else player.vy = 0;
  }
}

function createSystems(state, random) {
  const root = Math.floor(random() * 4294967296) >>> 0;
  const stream = (salt) => createRandom((root ^ salt) >>> 0);
  const api = (salt) => ({ state, rng: stream(salt) });

  state.toasts = [];
  state.respect = 0;
  state.busted = false;
  state.wasted = false;
  state.wantedStars = 0;
  state.harmless = false;
  state.systems = { effects: createEffectSystem(api(0x1101)) };
  state.systems.toast = (message) => state.systems.effects.toast(message);
  state.systems.vehicles = createVehicleSystem(api(0x2202));
  state.systems.traffic = createTrafficSystem(api(0x3303));
  state.systems.peds = createPedSystem(api(0x4404));
  state.systems.police = createPoliceSystem(api(0x5505));
  state.systems.wanted = createWantedSystem(api(0x6606));
  state.systems.combat = createCombatSystem(api(0x7707));
  state.systems.missions = createMissionSystem(api(0x8808));
  state.systems.audio = createAudioSystem(api(0x9909));
  state.systems.music = createMusicSystem(api(0xaa0a));

  function reset() {
    state.busted = false;
    state.wasted = false;
    state.wantedStars = 0;
    state.respect = 0;
    state.toasts.length = 0;
    state.player.inVehicle = null;
    state.systems.effects.reset();
    state.systems.vehicles.reset();
    state.systems.traffic.reset();
    state.systems.peds.reset();
    state.systems.police.reset();
    state.systems.wanted.clear();
    state.systems.combat.reset();
    state.systems.missions.reset();
    state.systems.audio.reset();
    state.systems.music.reset();
  }

  function step(dt, controls) {
    state.systems.wanted.step(dt);
    state.systems.police.step(dt);
    state.systems.traffic.step(dt);
    state.systems.peds.step(dt);
    state.systems.missions.step(dt, controls);
    state.systems.combat.step(dt, controls);
    state.systems.vehicles.step(dt, controls);
    state.systems.effects.step(dt);
    state.systems.audio.update(dt);
    state.systems.music.update(dt);
  }

  function respawn(kind) {
    const player = state.player;
    state.systems.vehicles.resetPlayer();
    state.systems.police.clear();
    state.systems.wanted.clear();
    state.systems.missions.onDeath();
    if (kind === 'busted') {
      player.cash = Math.max(0, player.cash - 180);
      state.systems.toast('Busted. The precinct took a booking fee.');
    } else {
      state.systems.toast('Wasted. A paramedic brought you back.');
    }
    const point = state.systems.vehicles.freePoint(WALKER.startX, WALKER.startY, player.radius)
      || { x: WALKER.startX, y: WALKER.startY };
    player.x = point.x;
    player.y = point.y;
    player.vx = 0;
    player.vy = 0;
    player.health = WALKER.health;
    player.armor = 0;
    player.aim.x = point.x;
    player.aim.y = point.y - 100;
    state.busted = false;
    state.wasted = false;
    state.systems.effects.burst(point.x, point.y, '#b7f1ec', 18);
    state.systems.audio.ui();
    cameraSnap(state);
  }

  return {
    reset,
    step,
    respawn,
    playerVehicle() { return state.systems.vehicles.playerVehicle(); },
    syncPlayer() { return state.systems.vehicles.syncPlayer(); },
  };
}

function cameraSnap(state) {
  state.camera.snap(state.player);
}

export function createWorld(random) {
  const city = createCity(random);
  const camera = createCamera();
  const environment = createEnvironment();
  const player = {
    x: WALKER.startX,
    y: WALKER.startY,
    vx: 0,
    vy: 0,
    width: WALKER.radius * 2,
    height: WALKER.radius * 2,
    radius: WALKER.radius,
    angle: -Math.PI / 2,
    aim: { x: WALKER.startX, y: WALKER.startY - 100 },
    health: WALKER.health,
    armor: WALKER.armor,
    cash: WALKER.cash,
    stepPhase: 0,
    moving: false,
  };
  const state = {
    player,
    city,
    camera,
    environment,
    items: [],
    score: 0,
    lives: 3,
    level: 1,
    elapsed: 0,
    area: districtAt(city, player.x, player.y),
    wanted: 0,
    weapon: 'fists',
    ammo: 0,
    message: '',
  };
  const systems = createSystems(state, random);
  Object.assign(state.systems, systems);

  function reset() {
    player.x = WALKER.startX;
    player.y = WALKER.startY;
    player.vx = 0;
    player.vy = 0;
    player.angle = -Math.PI / 2;
    player.aim.x = WALKER.startX;
    player.aim.y = WALKER.startY - 100;
    player.health = WALKER.health;
    player.armor = WALKER.armor;
    player.cash = WALKER.cash;
    player.stepPhase = 0;
    player.moving = false;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.elapsed = 0;
    state.wanted = 0;
    state.weapon = 'fists';
    state.ammo = 0;
    state.message = '';
    state.area = districtAt(city, player.x, player.y);
    camera.snap(player);
    environment.reset();
    state.systems.reset();
  }

  function step(dt, controls, harmless) {
    state.harmless = harmless;
    state.elapsed += dt;
    environment.update(dt);
    let moveX = 0;
    let moveY = 0;
    let running = false;
    let aim = null;
    if (typeof controls === 'number') {
      moveX = controls;
    } else if (controls !== null && controls !== undefined) {
      moveX = controls.x || 0;
      moveY = controls.y || 0;
      running = Boolean(controls.run);
      aim = controls.aim || null;
    }
    const length = Math.hypot(moveX, moveY);
    if (length > 1) {
      moveX /= length;
      moveY /= length;
    }
    const driven = state.systems && state.systems.playerVehicle();
    if (driven) {
      moveX = 0;
      moveY = 0;
      running = false;
      aim = null;
    }
    const speed = running ? WALKER.run : WALKER.walk;
    player.vx = harmless ? 0 : moveX * speed;
    player.vy = harmless ? 0 : moveY * speed;
    player.moving = length > 0 && !harmless;
    if (player.moving) moveWalker(city, player, player.vx * dt, player.vy * dt);
    if (aim !== null && !harmless) {
      player.aim.x = aim.x;
      player.aim.y = aim.y;
      const dx = aim.x - player.x;
      const dy = aim.y - player.y;
      if (dx * dx + dy * dy > 16) player.angle = Math.atan2(dy, dx);
    } else if (player.moving) {
      player.angle = Math.atan2(player.vy, player.vx);
    }
    player.stepPhase += (player.moving ? (running ? 15 : 10) : 1.5) * dt;
    camera.follow(player, dt, harmless ? null : player.aim);
    if (state.systems && !harmless) {
      state.systems.step(dt, controls);
      if (state.systems.syncPlayer()) camera.follow(player, dt, player.aim);
    }
    state.area = districtAt(city, player.x, player.y);
    return 0;
  }

  reset();
  return { state, reset, step };
}
