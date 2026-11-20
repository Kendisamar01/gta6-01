import { SAVE_KEY } from './config.js';

export function saveGame(world) {
  try {
    const data = {
      version: 1,
      seed: world.seed,
      x: world.player.x,
      y: world.player.y,
      money: world.player.money,
      respect: world.player.respect,
      hp: world.player.hp,
      armor: world.player.armor,
      weapon: world.player.weapon,
      ammo: world.player.ammo,
      reserve: world.player.reserve,
      missionId: world.mission.id,
      completed: world.mission.completed,
      time: world.timeOfDay,
      wanted: world.wanted.level,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
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
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    return;
  }
}

export function applySave(world, data) {
  if (!data) return;
  world.player.x = data.x;
  world.player.y = data.y;
  world.player.money = data.money ?? 250;
  world.player.respect = data.respect ?? 0;
  world.player.hp = data.hp ?? 100;
  world.player.armor = data.armor ?? 0;
  world.player.weapon = data.weapon === 'pistol' ? 'pistol' : 'fists';
  world.player.hasPistol = world.player.weapon === 'pistol';
  world.player.ammo = data.ammo ?? 0;
  world.player.reserve = data.reserve ?? 0;
  world.mission.id = Math.max(0, Math.min(7, data.missionId ?? 0));
  world.mission.completed = data.completed ?? 0;
  world.timeOfDay = data.time ?? 0.28;
  if ((data.wanted ?? 0) > 0) world.setWantedLevel(data.wanted, 'Saved heat');
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
}
