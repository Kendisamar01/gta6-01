export const SAVE_KEY = 'solara-bay.save.v1';

export function save(world) {
  try {
    const player = world.player;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 1,
      seed: world.seed,
      time: world.time,
      player: {
        x: player.x,
        y: player.y,
        health: player.health,
        armor: player.armor,
        money: player.money,
        respect: player.respect,
        weapon: player.weapon,
        ammo: player.ammo,
        reserve: player.reserve,
        skin: player.skin,
      },
      mission: {
        index: world.mission.index,
        completed: world.mission.completed.slice(),
      },
      stats: { ...world.stats },
    }));
    return true;
  } catch {
    return false;
  }
}

export function load(world) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !data.player) return false;
    const player = world.player;
    player.x = Number(data.player.x) || player.x;
    player.y = Number(data.player.y) || player.y;
    player.health = Math.max(1, Math.min(100, Number(data.player.health) || 100));
    player.armor = Math.max(0, Math.min(100, Number(data.player.armor) || 0));
    player.money = Math.max(0, Math.floor(Number(data.player.money) || 0));
    player.respect = Math.max(0, Math.floor(Number(data.player.respect) || 0));
    player.weapon = data.player.weapon || 'fists';
    player.ammo = Math.max(0, Math.floor(Number(data.player.ammo) || 0));
    player.reserve = Math.max(0, Math.floor(Number(data.player.reserve) || 0));
    player.skin = Math.max(0, Math.floor(Number(data.player.skin) || 0));
    player.inVehicle = null;
    player.vx = 0;
    player.vy = 0;
    world.time = Math.max(0, Math.min(23.99, Number(data.time) || 9.5));
    world.mission.index = Math.max(0, Math.min(7, Math.floor(Number(data.mission?.index) || 0)));
    world.mission.completed = Array.isArray(data.mission?.completed) ? data.mission.completed.slice() : [];
    world.mission.active = null;
    world.mission.dialogue = null;
    world.mission.failed = false;
    Object.assign(world.stats, data.stats || {});
    world.wanted = 0;
    world.heat = 0;
    world.screen = 'play';
    world.systems?.missions?.init?.(world);
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function event(event, world) {
  if (event.type === 'missionComplete') save(world);
}
