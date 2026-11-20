import { SAVE_KEY } from './config.js';

export function createSave(world) {
  function read() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function has() {
    return read() !== null;
  }

  function save() {
    const state = world.state;
    const player = state.player;
    const record = {
      version: 1,
      x: player.x,
      y: player.y,
      health: player.health,
      armor: player.armor,
      money: player.money,
      respect: state.respect,
      weapon: player.weapon,
      ammo: player.ammo,
      reserve: player.reserve,
      ownedPistol: player.ownedPistol === true,
      ownedSmg: player.ownedSmg === true,
      wanted: state.wanted,
      missionIndex: state.missionIndex ?? 0,
      sideDone: state.sideDone ?? 0,
      day: state.day,
      clock: state.clock,
    };
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(record));
      if (world.systems.effects) world.systems.effects.toast('Game saved.', '#6dd49a');
      if (world.systems.audio) world.systems.audio.blip(860);
      return true;
    } catch {
      if (world.systems.effects) world.systems.effects.toast('Saving is unavailable here.', '#e35b4f');
      return false;
    }
  }

  function load() {
    const record = read();
    if (!record || record.version !== 1) return false;
    const state = world.state;
    const player = state.player;
    player.x = Number.isFinite(record.x) ? record.x : player.x;
    player.y = Number.isFinite(record.y) ? record.y : player.y;
    player.health = Math.max(1, Math.min(100, record.health ?? 100));
    player.armor = Math.max(0, Math.min(100, record.armor ?? 0));
    player.money = Math.max(0, Math.round(record.money ?? 250));
    player.weapon = record.weapon ?? 'fists';
    player.ammo = Math.max(0, record.ammo ?? 0);
    player.reserve = Math.max(0, record.reserve ?? 0);
    player.ownedPistol = record.ownedPistol === true;
    player.ownedSmg = record.ownedSmg === true;
    state.respect = Math.max(0, record.respect ?? 0);
    state.wanted = Math.max(0, Math.min(5, record.wanted ?? 0));
    state.missionIndex = Math.max(0, Math.min(8, record.missionIndex ?? 0));
    state.sideDone = Math.max(0, record.sideDone ?? 0);
    state.day = Math.max(1, record.day ?? 1);
    state.clock = Math.max(0, record.clock ?? 0);
    world.camera.center(player.x, player.y);
    if (world.systems.missions && state.missionIndex < 8) world.systems.missions.start(state.missionIndex);
    if (world.systems.effects) world.systems.effects.toast('Game loaded.', '#6dd49a');
    if (world.systems.audio) world.systems.audio.blip(740);
    return true;
  }

  function erase() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  return { has, save, load, erase };
}
