// Boot and the single frame loop. Input is sampled once per frame, the simulation advances in
// fixed 1/60-second steps, the camera eases toward the player, and the renderer paints the result.
// Stage 2 modules are optional: they are probed with dynamic imports and only installed if they
// exist, which keeps this build playable on its own.
import { STEP } from './config.js';
import { createWorld, EVENT_AREA_CHANGE, EVENT_WASTED } from './world.js';
import { ACTION_CONFIRM, ACTION_HORN, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RELOAD, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createCamera } from './camera.js';
import { createEnvironment } from './environment.js';
import { stageShot } from './shots.js';
import { holdShot } from './shots.js';

const MAX_FRAME = 0.25;

const OPTIONAL_MODULES = [
  'vehicles.js', 'traffic.js', 'peds.js', 'police.js', 'wanted.js', 'combat.js',
  'missions.js', 'story.js', 'effects.js', 'audio.js', 'music.js', 'minimap.js', 'hud.js',
];
const SYSTEM_ORDER = ['effects', 'audio', 'music', 'vehicles', 'peds', 'wanted', 'police', 'traffic', 'combat', 'story', 'missions', 'minimap', 'hud'];
OPTIONAL_MODULES.push('menu.js', 'save.js');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const camera = createCamera();
const environment = createEnvironment();
const renderer = createRenderer(canvas);
const ctx = canvas.getContext('2d');
world.state.camera = camera;
camera.setBounds(world.city.size);
camera.snap(world.player.x, world.player.y);

const optional = {};
const systems = {};
let optionalContext = null;
if (shot) {
  optionalContext = { world, camera, environment, renderer, input: null, announce, optional, setScreen: () => {}, systems };
  world.state.systems = systems;
}

function runFor(method, ...args) {
  for (const name of SYSTEM_ORDER) {
    const system = systems[name];
    if (system && typeof system[method] === 'function') system[method](...args);
  }
}

function announce(message) {
  status.textContent = message;
}

function loadOptional() {
  for (const file of OPTIONAL_MODULES) {
    import(`./${file}`).then((module) => {
      optional[file] = module;
      if (optionalContext && typeof module.install === 'function') module.install(optionalContext);
    }).catch(() => {});
  }
}

function aimPoint(input) {
  const pointer = input.pointerState();
  const field = renderer.clientToField(pointer.x, pointer.y);
  return { field, world: camera.toWorld(field.x, field.y) };
}

function runShot(name) {
  const scene = stageShot(name, world);
  holdShot(name, world);
  camera.snap(world.player.x, world.player.y);
  environment.update(world.state.clock);
  let painted = 0;
  function paint() {
    renderer.draw(world, camera, environment, scene.screen, { x: 640, y: 360 });
    holdShot(name, world);
    const needed = ['hud.js', 'minimap.js', 'menu.js', 'save.js', 'vehicles.js', 'wanted.js'];
    if (painted < 180 && !needed.every((file) => optional[file])) {
      painted += 1;
      requestAnimationFrame(paint);
      return;
    }
    if (scene.screen !== SCREEN_TITLE) {
      const shotView = { world, camera, environment, renderer, input: null, announce, screen: scene.screen, elapsed: 0, ctx };
      for (const systemName of SYSTEM_ORDER) {
        const system = systems[systemName];
        if (system && typeof system.draw === 'function') system.draw(ctx, shotView);
      }
    }
    if (optional['menu.js'] && optional['menu.js'].menuDraw) {
      optional['menu.js'].menuDraw(ctx, { screen: scene.screen });
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  optionalContext = { world, camera, environment, renderer, input, announce, optional, setScreen: (next) => { screen = next; } };
  optionalContext.systems = systems;
  world.state.systems = systems;
  world.state.gameplay = {
    reset() { runFor('reset'); },
    beforeStep(dt, control) { runFor('beforeStep', control); },
    step(dt, control) { runFor('step', dt, control); },
    onDamage(amount) { runFor('onDamage', amount); },
  };

  function step(control) {
    const events = world.step(STEP, control);
    if (events & EVENT_AREA_CHANGE) announce(`${world.state.area} — ${world.state.street}`);
    if (events & EVENT_WASTED) {
      screen = SCREEN_OVER;
      announce('Wasted. Press Space to try again.');
      camera.kick(14);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (optional['menu.js'] && optional['menu.js'].menuConsume && optional['menu.js'].menuConsume(actions, screen)) return;
    if (actions & ACTION_MUTE && optional['audio.js'] && optional['audio.js'].toggleMute) optional['audio.js'].toggleMute();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      world.reset();
      camera.snap(world.player.x, world.player.y);
      screen = SCREEN_PLAY;
      announce(`Welcome to Solara Bay. You are in ${world.state.area}.`);
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_INTERACT && optional['vehicles.js'] && optional['vehicles.js'].interact) optional['vehicles.js'].interact();
    if (actions & ACTION_HORN && optional['vehicles.js'] && optional['vehicles.js'].horn) optional['vehicles.js'].horn();
    if (actions & ACTION_RELOAD && optional['combat.js'] && optional['combat.js'].reload) optional['combat.js'].reload();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    const aim = aimPoint(input);

    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        const controls = input.controls();
        step(screen === SCREEN_TITLE
          ? { x: 0, y: 0, run: false, aimX: world.player.x, aimY: world.player.y }
          : { ...controls, aimX: aim.world.x, aimY: aim.world.y });
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    camera.follow(world.player, elapsed);
    camera.update(elapsed);
    environment.update(world.state.clock);
    renderer.draw(world, camera, environment, screen, aim.field);
    if (screen !== SCREEN_TITLE) {
      const view = { world, camera, environment, renderer, input, announce, screen, elapsed, ctx };
      for (const name of SYSTEM_ORDER) {
        const system = systems[name];
        if (system && typeof system.draw === 'function') system.draw(ctx, view);
      }
    }
    if (optional['menu.js']) {
      const menuView = { world, camera, environment, renderer, input, announce, screen, elapsed, ctx };
      if (optional['menu.js'].menuStep) optional['menu.js'].menuStep(elapsed);
      if (optional['menu.js'].menuDraw) optional['menu.js'].menuDraw(ctx, menuView);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  window.__solara = { world, camera, environment, renderer, input, optional };
  announce('Solara Bay. Press Space or click to explore.');
  requestAnimationFrame(frame);
}

loadOptional();
if (shot) runShot(shot);
else runGame();
