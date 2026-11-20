import { missionAt } from './story.js';

const KEY = 'solara-bay.save.v1';
const VERSION = 1;

let active = null;

function store() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function number(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

export function createSave(context) {
  function snapshot() {
    const world = context.world;
    const state = world.state;
    const player = world.player;
    const run = state.missions;
    const combat = state.combat;
    const heat = state.wantedState;
    const mission = state.mission;
    return {
      version: VERSION,
      savedAt: Date.now(),
      seed: state.seed,
      player: {
        x: player.x,
        y: player.y,
        angle: player.angle,
        health: player.health,
        armor: player.armor,
        money: player.money,
        wanted: player.wanted,
      },
      elapsed: state.elapsed,
      clock: state.clock,
      mission: run ? {
        index: run.index,
        phase: run.phase,
        objective: mission ? mission.objective : '',
        marker: mission && mission.marker ? { x: mission.marker.x, y: mission.marker.y } : null,
        respect: run.respect,
        finished: run.finished,
        timer: run.timer,
      } : null,
      combat: combat ? { weapon: combat.weapon, mag: combat.mag, reserve: combat.reserve } : null,
      wanted: heat ? { heat: heat.heat, stars: heat.stars } : null,
    };
  }

  function read() {
    const location = store();
    if (!location) return null;
    try {
      const raw = location.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== VERSION || !data.player) return null;
      return data;
    } catch {
      return null;
    }
  }

  function write() {
    const location = store();
    if (!location) return false;
    try {
      location.setItem(KEY, JSON.stringify(snapshot()));
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    const location = store();
    if (!location) return false;
    try {
      location.removeItem(KEY);
      return true;
    } catch {
      return false;
    }
  }

  function restore(data) {
    if (!context || !data || data.version !== VERSION || !data.player) return false;
    const world = context.world;
    const state = world.state;
    const player = world.player;
    const saved = data.player;
    world.reset();
    world.teleport(number(saved.x, player.x), number(saved.y, player.y));
    player.angle = number(saved.angle, player.angle);
    player.health = clamp(number(saved.health, 100), 1, 100);
    player.armor = clamp(number(saved.armor, 0), 0, 100);
    player.money = Math.max(0, number(saved.money, 250));
    player.wanted = clamp(Math.round(number(saved.wanted, 0)), 0, 5);
    player.wasted = false;
    state.wasted = false;
    state.busted = false;
    state.elapsed = Math.max(0, number(data.elapsed, 0));
    state.clock = ((number(data.clock, 0.33) % 1) + 1) % 1;
    state.message = 'Save loaded. Welcome back to Solara Bay.';

    const run = state.missions;
    const progress = data.mission;
    if (run && progress) {
      const index = Math.max(0, Math.floor(number(progress.index, 0)));
      run.index = index;
      run.mission = missionAt(index);
      run.phase = progress.phase === 'active' ? 'active' : 'brief';
      run.chat = [];
      run.chatIndex = 0;
      run.respect = Math.max(0, number(progress.respect, 0));
      run.finished = Math.max(0, number(progress.finished, 0));
      run.timer = Math.max(0, number(progress.timer, run.mission.time || 0));
      run.elapsed = 0;
      run.side = null;
      if (Array.isArray(run.enemies)) run.enemies.length = 0;
      if (state.mission) {
        state.mission.objective = progress.objective || run.mission.objective || '';
        const marker = progress.marker;
        state.mission.marker = marker && Number.isFinite(marker.x) && Number.isFinite(marker.y)
          ? { x: marker.x, y: marker.y }
          : (run.mission.target ? { x: run.mission.target.x, y: run.mission.target.y } : null);
      }
    }

    const kit = data.combat;
    if (kit && state.combat) {
      state.combat.weapon = kit.weapon === 'pistol' ? 'pistol' : 'fists';
      state.combat.mag = clamp(Math.round(number(kit.mag, 0)), 0, 12);
      state.combat.reserve = Math.max(0, Math.round(number(kit.reserve, 0)));
      state.combat.reloadTimer = 0;
      player.weapon = state.combat.weapon;
      player.ammo = state.combat.mag;
    }

    const heat = data.wanted;
    if (heat && state.wantedState) {
      state.wantedState.heat = clamp(number(heat.heat, 0), 0, 220);
      state.wantedState.stars = player.wanted;
      state.wantedState.quiet = 0;
      state.wantedState.chase = 0;
      state.wantedState.bustedTime = 0;
    }

    const systems = state.systems || {};
    if (player.wanted === 0) {
      if (systems.police && systems.police.standDown) systems.police.standDown();
      if (systems.audio && systems.audio.setSiren) systems.audio.setSiren(false, 0);
    } else if (systems.police && systems.police.alert) {
      systems.police.alert(player.wanted);
    }
    if (context.camera && context.camera.snap) context.camera.snap(player.x, player.y);
    if (context.camera && context.camera.update) context.camera.update(0);
    if (context.environment && context.environment.update) context.environment.update(state.clock);
    if (context.announce) context.announce('Save loaded. Back on the street.');
    return true;
  }

  return { key: KEY, snapshot, read, write, clear, restore, has() { return read() !== null; } };
}

export function install(context) {
  active = createSave(context);
  context.systems.save = active;
}

export function saveGame() {
  return active ? active.write() : false;
}

export function loadGame() {
  return active ? active.restore(active.read()) : false;
}

export function hasSave() {
  return active ? active.has() : false;
}

export function clearSave() {
  return active ? active.clear() : false;
}
