import { DAY, WALKER } from './config.js';
import { districtAt } from './city.js';
import { totalMissions } from './story.js';
import { clamp } from './util.js';

const SAVE_KEY = 'solara-bay.save.v1';
const SAVE_VERSION = 1;
const AUTOSAVE_SECONDS = 45;
let autosaveClock = 0;

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function number(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function point(value) {
  return value && Number.isFinite(value.x) && Number.isFinite(value.y)
    ? { x: value.x, y: value.y }
    : null;
}

function snapshot(state) {
  const player = state.player;
  const combat = state.systems.combat;
  const mission = state.mission;
  const side = state.side;
  const car = state.systems.vehicles.playerVehicle();
  return {
    version: SAVE_VERSION,
    seed: state.seed >>> 0,
    elapsed: number(state.elapsed),
    time: number(state.environment.state.time),
    player: {
      x: number(player.x, WALKER.startX),
      y: number(player.y, WALKER.startY),
      angle: number(player.angle),
      health: number(player.health, WALKER.health),
      armor: number(player.armor),
      cash: number(player.cash, WALKER.cash),
    },
    respect: number(state.respect),
    wanted: Math.round(number(state.wantedStars) * 100) / 100,
    loadout: combat ? {
      pistol: combat.owns('pistol'),
      smg: combat.owns('smg'),
      weapon: state.weapon,
      ammo: state.ammo,
      pistolReserve: combat.reserveFor('pistol'),
      smgReserve: combat.reserveFor('smg'),
    } : null,
    mission: mission ? {
      index: number(mission.index),
      completed: mission.completed.slice(),
      active: Boolean(mission.active),
      canRetry: Boolean(mission.canRetry),
      stage: number(mission.stage),
      reason: mission.reason || '',
      timer: number(mission.timer),
      progress: number(mission.progress),
      checkpoint: number(mission.checkpoint),
    } : null,
    side: side ? {
      active: side.active || null,
      stage: number(side.stage),
      timer: number(side.timer),
      score: number(side.score),
      target: point(side.target),
    } : null,
    vehicle: car ? {
      type: car.type,
      x: number(car.x),
      y: number(car.y),
      angle: number(car.angle),
      speed: number(car.speed),
      color: car.color,
      hp: number(car.hp, car.maxHp),
      maxHp: number(car.maxHp, car.hp),
    } : null,
  };
}

function readSave() {
  const localStorage = storage();
  if (!localStorage) return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.version === SAVE_VERSION && data.player ? data : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  if (!state || state.harmless) return false;
  const localStorage = storage();
  if (!localStorage) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot(state)));
    return true;
  } catch {
    return false;
  }
}

export function loadState(state) {
  const data = readSave();
  if (!data || !state || !state.systems) return false;
  const systems = state.systems;
  systems.police.clear();
  systems.vehicles.reset();
  systems.traffic.reset();
  systems.peds.reset();
  systems.wanted.clear();
  systems.combat.reset();
  systems.missions.reset();
  systems.effects.reset();
  systems.music.reset();

  const player = state.player;
  player.x = clamp(number(data.player.x, WALKER.startX), 24, state.city.width - 24);
  player.y = clamp(number(data.player.y, WALKER.startY), 24, state.city.shoreY - 24);
  player.vx = 0;
  player.vy = 0;
  player.angle = number(data.player.angle);
  player.aim.x = player.x + Math.cos(player.angle) * 120;
  player.aim.y = player.y + Math.sin(player.angle) * 120;
  player.health = clamp(number(data.player.health, WALKER.health), 1, 100);
  player.armor = clamp(number(data.player.armor), 0, 100);
  player.cash = Math.max(0, number(data.player.cash, WALKER.cash));
  player.stepPhase = 0;
  player.moving = false;
  player.inVehicle = null;

  state.elapsed = Math.max(0, number(data.elapsed));
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.wasted = false;
  state.busted = false;
  state.harmless = false;
  state.message = '';
  state.respect = Math.max(0, number(data.respect));
  state.wantedStars = 0;
  state.wanted = 0;
  state.area = districtAt(state.city, player.x, player.y);
  state.environment.state.time = ((number(data.time) % DAY.length) + DAY.length) % DAY.length;
  state.environment.update(0);

  if (systems.combat.restore) systems.combat.restore(data.loadout);
  if (data.mission && state.mission) {
    const mission = state.mission;
    mission.completed = Array.isArray(data.mission.completed) ? data.mission.completed.slice() : [];
    mission.index = clamp(Math.floor(number(data.mission.index)), 0, totalMissions() - 1);
    if (data.mission.active) systems.missions.startMission();
    mission.canRetry = Boolean(data.mission.canRetry) && !mission.active;
    mission.reason = data.mission.reason || '';
    mission.timer = number(data.mission.timer);
    mission.progress = number(data.mission.progress);
    mission.checkpoint = number(data.mission.checkpoint);
  }
  if (data.side && state.side) {
    state.side.active = typeof data.side.active === 'string' ? data.side.active : null;
    state.side.stage = number(data.side.stage);
    state.side.timer = number(data.side.timer);
    state.side.score = number(data.side.score);
    state.side.target = point(data.side.target);
    state.side.fare = null;
  }

  if (data.vehicle) {
    const info = data.vehicle;
    const car = systems.vehicles.spawn(
      info.type,
      number(info.x, player.x),
      number(info.y, player.y),
      number(info.angle),
    );
    car.maxHp = Math.max(1, number(info.maxHp, car.maxHp));
    car.hp = clamp(number(info.hp, car.maxHp), 1, car.maxHp);
    car.speed = number(info.speed);
    car.color = typeof info.color === 'string' ? info.color : car.color;
    car.parked = false;
    car.occupiedBy = 'player';
    car.driver = player;
    car.aiInput = null;
    player.inVehicle = car;
  }

  systems.wanted.set(clamp(number(data.wanted), 0, 5));
  state.camera.snap(player);
  systems.toast('Save loaded. Welcome back to Solara Bay.');
  systems.audio.ui();
  return true;
}

export function clearSave() {
  const localStorage = storage();
  if (!localStorage) return false;
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  return Boolean(readSave());
}

export function describe() {
  const data = readSave();
  if (!data) return 'No saved game yet';
  const minutes = Math.floor(number(data.elapsed) / 60);
  const chapter = data.mission ? Math.min(totalMissions(), number(data.mission.index) + 1) : 1;
  return `Save ${chapter}/${totalMissions()} · $${Math.round(number(data.player.cash))} · ${minutes}m played`;
}

export function step(state, dt) {
  if (!state || state.harmless || state.menuOpen) return;
  autosaveClock += Math.max(0, Math.min(number(dt), 0.25));
  if (autosaveClock >= AUTOSAVE_SECONDS) {
    autosaveClock = 0;
    saveState(state);
  }
}

export function flush(state) {
  if (state && !state.harmless) saveState(state);
}

export function onStart(state) {
  autosaveClock = 0;
  if (state) state.seed = state.seed >>> 0;
}

export function onEnd(state) {
  saveState(state);
}

export const SAVE_SLOT = SAVE_KEY;
