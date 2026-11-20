// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from a
// fresh world for a fixed number of steps, steered by a simple autopilot (look ahead each way the
// paddle could move, keep clear of blocks, chase the lowest coin when that is safe), so the frame
// is what a short game really looks like and the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, KIND_BLOCK } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { WALKER, WORLD } from './config.js';
import { missionAt } from './story.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
/**
 * How far ahead, in seconds, the autopilot checks each way it could move: the play scene's pilot
 * looks well ahead and keeps all its lives; the end scene's looks only a moment ahead, so it is
 * caught out once the blocks speed up, as a hurried player is.
 */
const HORIZON_PLAY = 0.7;
const HORIZON_END = 0.25;
const SAMPLE = 1 / 30;
const DIRECTIONS = [0, -1, 1];
/** Extra room, each side, it keeps between the paddle and a block. */
const MARGIN = 10;

/** Seconds until moving in `direction` (-1, 0, 1) runs the paddle into a block; Infinity when it never does. */
function timeToHit(state, direction, horizon) {
  const player = state.player;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * PLAYER.speed * t));
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind !== KIND_BLOCK) continue;
      const y = item.y + item.speed * t;
      if (y + item.height > player.y && y < player.y + player.height && item.x < x + player.width + MARGIN && item.x + item.width > x - MARGIN) return t;
    }
  }
  return Infinity;
}

/** Of the safe ways to move, the one toward the lowest coin (or the centre); else the one that is hit last. */
function autopilot(state, horizon) {
  const player = state.player;
  let coin = null;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (item.active && item.kind !== KIND_BLOCK && (coin === null || item.y > coin.y)) coin = item;
  }
  const target = coin === null ? FIELD.width / 2 : coin.x + coin.width / 2;
  const centre = player.x + player.width / 2;
  const wanted = target > centre + 8 ? 1 : target < centre - 8 ? -1 : 0;
  let best = wanted;
  let bestTime = timeToHit(state, wanted, horizon);
  for (let index = 0; index < DIRECTIONS.length && bestTime !== Infinity; index += 1) {
    const time = timeToHit(state, DIRECTIONS[index], horizon);
    if (time > bestTime) {
      bestTime = time;
      best = DIRECTIONS[index];
    }
  }
  return best;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, horizon), false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}

function shotControls(x, y) {
  return { x, y, run: false, aim: null, attack: false, actions: 0, handbrake: false, horn: false, weapon: 0 };
}

function shotSettle(world, seconds, x, y, harmless) {
  const steps = Math.max(1, Math.floor(seconds / STEP));
  for (let index = 0; index < steps; index += 1) world.step(STEP, shotControls(x, y), Boolean(harmless));
}

function shotCar(state, x, y, type, angle, color) {
  const vehicles = state.systems.vehicles;
  const point = vehicles.freePoint(x, y, 46) || { x, y };
  const car = vehicles.spawn(type, point.x, point.y, angle);
  car.color = color;
  car.parked = false;
  car.occupiedBy = 'player';
  car.driver = state.player;
  car.aiInput = null;
  state.player.inVehicle = car;
  return car;
}

stageShot = function (name, world) {
  world.reset();
  const state = world.state;
  if (name === 'drive') {
    const car = shotCar(state, WALKER.startX, WALKER.startY, 'sport', 0, '#e04d46');
    car.speed = 132;
    state.systems.wanted.set(1);
    state.systems.toast('Sunstrand Boulevard is open.');
    shotSettle(world, 1.6, 0, -1, false);
    state.camera.snap(state.player);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'chase') {
    const car = shotCar(state, WALKER.startX - WORLD.cell, WALKER.startY + WORLD.cell, 'sport', -Math.PI / 2, '#f0b43c');
    car.speed = 168;
    car.hp = 240;
    car.maxHp = 240;
    state.systems.combat.give('smg', 96);
    state.systems.wanted.set(4);
    const cruiser = state.systems.vehicles.spawn('cruiser', state.player.x + 250, state.player.y - 170, Math.PI);
    cruiser.siren = true;
    cruiser.police = true;
    cruiser.speed = 110;
    state.systems.toast('Four stars. Lose the patrol before they box you in.');
    shotSettle(world, 2.4, 0.18, -1, false);
    state.systems.combat.spawnBullet(state.player.x, state.player.y, -0.4, 620, 'player', 14, '#fff0b0');
    state.camera.snap(state.player);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'mission') {
    const data = missionAt(3);
    state.mission.index = 3;
    state.systems.missions.startMission();
    const target = data.steps[0].target;
    state.player.x = target.x;
    state.player.y = target.y;
    state.player.health = 100;
    state.player.armor = 60;
    state.systems.combat.give('pistol', 60);
    state.camera.snap(state.player);
    shotSettle(world, 0.55, 0, 0, false);
    shotSettle(world, 0.9, 0, 0, false);
    state.systems.toast('Clear the Ironworks yard.');
    state.camera.snap(state.player);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  shotSettle(world, 0.5, 0, 0, true);
  return { screen: SCREEN_TITLE, best: 0 };
};
