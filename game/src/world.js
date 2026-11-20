import { PLAYER } from './config.js';

export const EVENT_DEAD = 1;
export const EVENT_BUSTED = 2;
export const EVENT_RESPAWN = 4;

export function createWorld(city, camera, random, seed) {
  const steps = [];
  const resets = [];
  const systems = {};

  function freshPlayer() {
    return {
      x: city.start.x,
      y: city.start.y,
      aim: -Math.PI / 2,
      health: PLAYER.health,
      armor: 0,
      money: 250,
      weapon: 'fists',
      ammo: 0,
      reserve: 0,
      reload: 0,
      flash: 0,
      punch: 0,
      invisible: 0,
      inCar: null,
      lastCar: null,
      enterCooldown: 0,
      crouch: false,
    };
  }

  const state = {
    player: freshPlayer(),
    vehicles: [],
    policeCars: [],
    peds: [],
    bullets: [],
    particles: [],
    pickups: [],
    markers: [],
    toasts: [],
    wanted: 0,
    wantedProgress: 0,
    wantedHidden: 0,
    respect: 0,
    moneyEarned: 0,
    kills: 0,
    clock: 0,
    busted: false,
    respawn: 0,
    objective: '',
    area: '',
    areaTimer: 0,
    dialogue: null,
    mission: null,
    sideActivity: null,
    slowMotion: 0,
    day: 1,
    missionIndex: 0,
    sideDone: 0,
    bustedSeen: false,
  };

  function reset() {
    state.player = freshPlayer();
    state.vehicles.length = 0;
    state.policeCars.length = 0;
    state.peds.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.pickups.length = 0;
    state.markers.length = 0;
    state.toasts.length = 0;
    state.wanted = 0;
    state.wantedProgress = 0;
    state.wantedHidden = 0;
    state.respect = 0;
    state.moneyEarned = 0;
    state.kills = 0;
    state.clock = 0;
    state.busted = false;
    state.respawn = 0;
    state.objective = '';
    state.area = '';
    state.areaTimer = 0;
    state.dialogue = null;
    state.mission = null;
    state.sideActivity = null;
    state.slowMotion = 0;
    state.missionIndex = 0;
    state.sideDone = 0;
    state.bustedSeen = false;
    camera.center(city.start.x, city.start.y);
    for (const hook of resets) hook();
    if (systems.resetAll) systems.resetAll();
  }

  function respawn() {
    state.player.x = city.start.x;
    state.player.y = city.start.y;
    state.player.health = PLAYER.health;
    state.player.armor = 0;
    state.player.invisible = 2.2;
    state.player.inCar = null;
    state.busted = false;
    state.respawn = 0;
    state.wanted = 0;
    camera.center(city.start.x, city.start.y);
    for (const hook of resets) hook();
    if (systems.resetAll) systems.resetAll();
  }

  function attemptMove(x, y) {
    const radius = PLAYER.radius;
    if (!city.isSolid(x, state.player.y, radius)) state.player.x = x;
    if (!city.isSolid(state.player.x, y, radius)) state.player.y = y;
  }

  function step(dt, control) {
    let events = 0;
    state.clock += dt;
    const player = state.player;

    if (state.respawn > 0) {
      state.respawn -= dt;
      if (state.respawn <= 0) {
        respawn();
        events |= EVENT_RESPAWN;
      }
      return events;
    }

    if (player.invisible > 0) player.invisible = Math.max(0, player.invisible - dt);
    if (player.flash > 0) player.flash = Math.max(0, player.flash - dt);
    if (player.punch > 0) player.punch = Math.max(0, player.punch - dt * 4);
    if (player.enterCooldown > 0) player.enterCooldown = Math.max(0, player.enterCooldown - dt);
    if (player.reload > 0) player.reload = Math.max(0, player.reload - dt);

    if (control.aim !== undefined) player.aim = control.aim;
    if (player.inCar === null) {
      const move = control.move ?? { x: 0, y: 0 };
      const length = Math.hypot(move.x, move.y) || 1;
      const speed = move.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      attemptMove(player.x + (move.x / length) * speed * dt, player.y + (move.y / length) * speed * dt);
    }

    for (const hook of steps) hook(dt, control);
    const currentArea = city.districtAt(player.x, player.y);
    if (state.areaTimer > 0) state.areaTimer = Math.max(0, state.areaTimer - dt);
    if (currentArea !== state.area) {
      state.area = currentArea;
      state.areaTimer = 3.5;
    }

    if (systems.effects) systems.effects.step(dt);
    if (systems.vehicles) systems.vehicles.step(dt, control);
    if (systems.traffic) systems.traffic.step(dt);
    if (systems.peds) systems.peds.step(dt);
    if (systems.police) systems.police.step(dt);
    if (systems.wanted) systems.wanted.step(dt);
    if (systems.combat) systems.combat.step(dt, control);
    if (systems.missions) systems.missions.step(dt);
    if (systems.audio) systems.audio.step(dt, state.clock);
    if (systems.music) systems.music.step(dt);

    if (state.busted && !state.bustedSeen) {
      state.bustedSeen = true;
      events |= EVENT_BUSTED;
    }
    if (!state.busted) state.bustedSeen = false;

    if (player.health <= 0 && state.respawn === 0) {
      state.respawn = PLAYER.respawnDelay;
      state.player.health = 0;
      events |= EVENT_DEAD;
    }

    const leadX = Math.cos(player.aim) * 70;
    const leadY = Math.sin(player.aim) * 70;
    camera.follow(player, leadX, leadY, dt);
    return events;
  }

  reset();
  return {
    state, steps, resets, systems, step, reset, respawn, random, seed, city, camera,
    get player() { return state.player; },
    get vehicles() { return state.vehicles; },
    get policeCars() { return state.policeCars; },
    get peds() { return state.peds; },
    get bullets() { return state.bullets; },
    get particles() { return state.particles; },
    get pickups() { return state.pickups; },
    get markers() { return state.markers; },
    get toasts() { return state.toasts; },
  };
}
