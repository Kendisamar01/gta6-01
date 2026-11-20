// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, createControls } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { resumeAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
world.state.seed = seed;
const renderer = createRenderer(canvas);

const optional = Object.create(null);
const futureModules = [
  'vehicles', 'traffic', 'peds', 'police', 'wanted', 'combat', 'missions', 'story',
  'effects', 'audio', 'music', 'minimap', 'hud', 'menu', 'save',
];
for (const name of futureModules) {
  import('./' + name + '.js').then((module) => {
    optional[name] = module;
  }).catch(() => {
    optional[name] = null;
  });
}
Promise.all(futureModules.map((name) => import('./' + name + '.js').catch(() => null))).then((modules) => {
  window.__modulesReady = true;
  return modules;
});

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function safe(fn, context, state) {
  try {
    fn(context, state);
  } catch {
    return;
  }
}

function extrasFor() {
  const extras = { hud: [], entities: [], overlay: [] };
  if (optional.hud && typeof optional.hud.draw === 'function') {
    extras.hud.push((context, state) => safe(optional.hud.draw, context, state));
  }
  if (optional.minimap && typeof optional.minimap.draw === 'function') {
    extras.hud.push((context, state) => safe(optional.minimap.draw, context, state, world.state.camera));
  }
  for (const name of futureModules) {
    const module = optional[name];
    if (module && typeof module.draw === 'function' && name !== 'hud' && name !== 'minimap') {
      extras.entities.push((context, state) => safe(module.draw, context, state));
    }
  }
  return extras;
}

function advanceSystems(dt, controls) {
  for (const name of futureModules) {
    const module = optional[name];
    if (!module) continue;
    const fn = module.step || module.update;
    if (typeof fn !== 'function') continue;
    try {
      fn(world.state, dt, controls);
    } catch {
      continue;
    }
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, extrasFor());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createControls(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    resumeAudio();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Solara Bay. Walk with W A S D and run with Shift.');
  }
  const launchRun = startGame;
  startGame = function () {
    launchRun();
    const store = optional.save;
    if (store && typeof store.onStart === 'function') store.onStart(world.state);
  };

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Wasted. Score ${world.state.score}. Best ${best}.`);
  }
  const finishRun = endGame;
  endGame = function () {
    const store = optional.save;
    if (store && typeof store.onEnd === 'function') store.onEnd(world.state);
    finishRun();
  };

  function handleActions(actions) {
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen === SCREEN_PLAY && actions & ACTION_MUTE) {
      const audio = optional.audio;
      if (audio && typeof audio.toggle === 'function') audio.toggle();
    }
  }
  const playActions = handleActions;
  handleActions = function (actions) {
    const menu = optional.menu;
    if (menu && typeof menu.control === 'function' && menu.control(world.state, actions, input.move(), screen)) {
      announce(menu.status ? menu.status(world.state) : 'Menu.');
      return;
    }
    playActions(actions);
  };

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, true);
      return;
    }
    const move = input.move();
    const controls = {
      x: move.x,
      y: move.y,
      run: input.run(),
      aim: world.state.camera.toWorld(input.pointer.x, input.pointer.y),
      attack: input.takeClick(),
      actions,
    };
    controls.handbrake = input.isDown('Space');
    controls.horn = input.isDown('KeyH');
    controls.weapon = input.isDown('Digit1') ? 1 : input.isDown('Digit2') ? 2 : input.isDown('Digit3') ? 3 : 0;
    world.step(STEP, controls, false);
    advanceSystems(STEP, controls);
    if (world.state.busted || world.state.wasted) {
      const kind = world.state.busted ? 'busted' : 'wasted';
      world.state.systems.respawn(kind);
      announce(kind === 'busted' ? 'Busted. You woke up at the safehouse.' : 'Wasted. You woke up at the safehouse.');
    }
    if (world.state.player.health <= 0) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (world.state.menuOpen) accumulator = 0;
    handleActions(actions);
    if (world.state.restartRequested) {
      world.state.restartRequested = false;
      world.reset();
      screen = SCREEN_PLAY;
      announce('New run. Explore Solara Bay.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, extrasFor());
  }

  // Leaving the tab pauses a running game rather than letting blocks fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solara Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
window.addEventListener('beforeunload', () => {
  const store = optional.save;
  if (store && typeof store.flush === 'function') store.flush(world.state);
});
