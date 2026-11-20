import { SAVE_ID } from './config.js';
import { forceStars } from './wanted.js';
import { STORY_COUNT } from './missions.js';

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveGame(world) {
  const store = storage();
  if (store === null) return false;
  try {
    const data = {
      edition: 2,
      seed: world.seed,
      x: world.player.x,
      y: world.player.y,
      money: world.player.money,
      respect: world.player.respect,
      hp: world.player.hp,
      armor: world.player.armor,
      weapon: world.player.weapon,
      hasGun: world.player.hasGun,
      ammo: world.player.ammo,
      reserve: world.player.reserve,
      mission: world.mission.id,
      cleared: world.mission.completed,
      clock: world.dayClock,
      stars: world.wanted.stars,
    };
    store.setItem(SAVE_ID, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave() {
  const store = storage();
  if (store === null) return null;
  try {
    const raw = store.getItem(SAVE_ID);
    if (raw === null) return null;
    const data = JSON.parse(raw);
    if (!data || data.edition !== 2) return null;
    if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return readSave() !== null;
}

export function deleteSave() {
  const store = storage();
  if (store === null) return;
  try {
    store.removeItem(SAVE_ID);
  } catch {
    return;
  }
}

export function applySave(world, data) {
  if (!data) return;
  const player = world.player;
  player.x = data.x;
  player.y = data.y;
  player.money = Number.isFinite(data.money) ? data.money : 260;
  player.respect = Number.isFinite(data.respect) ? data.respect : 0;
  player.hp = Number.isFinite(data.hp) ? Math.max(1, Math.min(100, data.hp)) : 100;
  player.armor = Number.isFinite(data.armor) ? Math.max(0, Math.min(100, data.armor)) : 0;
  player.hasGun = data.weapon === 'pistol' || data.hasGun === true;
  player.weapon = player.hasGun ? 'pistol' : 'fists';
  player.ammo = Number.isFinite(data.ammo) ? data.ammo : 0;
  player.reserve = Number.isFinite(data.reserve) ? data.reserve : 0;
  player.carId = null;
  player.dead = false;

  world.mission.id = Math.max(0, Math.min(STORY_COUNT - 1, Math.floor(data.mission ?? 0)));
  world.mission.completed = Math.max(0, Math.floor(data.cleared ?? 0));
  world.dayClock = Number.isFinite(data.clock) ? ((data.clock % 1) + 1) % 1 : 0.28;
  if ((data.stars ?? 0) > 0) forceStars(world, data.stars, 'Saved heat');
  world.camera.x = player.x;
  world.camera.y = player.y;
}
