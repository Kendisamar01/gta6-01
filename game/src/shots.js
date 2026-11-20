// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from a
// fresh world for a fixed number of steps, steered by a simple autopilot (look ahead each way the
// paddle could move, keep clear of blocks, chase the lowest coin when that is safe), so the frame
// is what a short game really looks like and the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, KIND_BLOCK } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

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

import { CITY, SCREENS } from './config.js';
import { updateCamera } from './camera.js';

export function stageSolaraShot(name, api) {
  const world = api.world;
  const camera = api.camera;
  world.intro = 1;
  world.elapsed = 7.4;
  world.controlsOpen = false;
  if (name === 'start') {
    world.screen = SCREENS.title;
    world.menuIndex = 0;
    world.time = 17.1;
    return;
  }
  world.screen = SCREENS.play;
  world.menuIndex = 0;
  world.time = name === 'chase' ? 18.1 : 10.6;
  const avenue = 6 * CITY.cell + CITY.road / 2;
  const cross = 7 * CITY.cell + CITY.road / 2;
  world.player.x = avenue + 26;
  world.player.y = cross + 18;
  world.player.angle = -0.15;
  world.player.vx = 0;
  world.player.vy = 0;
  world.player.health = 100;
  world.wanted = name === 'chase' ? 3 : 0;
  world.heat = name === 'chase' ? 34 : 0;
  updateCamera(camera, world.player, 1 / 60, 0);
  api.systems.missions?.stageShot?.(name, api);
  api.systems.vehicles?.stageShot?.(name, api);
  api.systems.police?.stageShot?.(name, api);
  api.systems.hud?.stageShot?.(name, api);
}
