import { STEP } from './config.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import {
  createRenderer, SCREEN_CONTROLS, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';
import { initAudio, toggleMute } from './audio.js';
import { applySave, hasSave, readSave, saveGame } from './save.js';
import { PAUSE_ITEM_COUNT, TITLE_ITEM_COUNT } from './menu.js';
import { INTRO_DIALOGUE } from './story.js';

const MAX_ELAPSED = 0.25;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const requestedSeed = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(requestedSeed) ? requestedSeed : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
let world = createWorld(seed, { silent: shotName !== null });
const renderer = createRenderer(canvas);

function announce(message) {
  if (status !== null) status.textContent = message;
}

function runShot() {
  const screen = stageShot(shotName, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let previousScreen = SCREEN_PLAY;
  let accumulator = 0;
  let lastTime = performance.now();
  let menuDelay = 0;
  let elapsed = 0;

  world.hasSave = hasSave();
  world.menu.index = world.hasSave ? 1 : 0;
  announce('Solara Bay. Choose New Game or Continue.');

  window.addEventListener('keydown', initAudio, { once: true });
  canvas.addEventListener('pointerdown', initAudio, { once: true });

  function beginNewGame() {
    world = createWorld(seed);
    world.hasSave = false;
    world.openDialogue(INTRO_DIALOGUE, () => world.toast('Welcome to Solara Bay'));
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('New game started. Follow the marker to Cafe Coral.');
  }

  function loadGame() {
    const data = readSave();
    if (data === null) {
      world.toast('No saved game found');
      return;
    }
    world = createWorld(data.seed ?? seed);
    applySave(world, data);
    world.hasSave = true;
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Saved game loaded.');
  }

  function moveSelection(controls, count) {
    if (menuDelay > 0 || controls.y === 0) return;
    const step = controls.y > 0 ? 1 : -1;
    let next = world.menu.index;
    for (let i = 0; i < count; i += 1) {
      next = (next + step + count) % count;
      if (screen !== SCREEN_TITLE || next !== 1 || world.hasSave) break;
    }
    world.menu.index = next;
    menuDelay = 0.16;
    world.sfx('ui');
  }

  function handleMenu(controls) {
    menuDelay = Math.max(0, menuDelay - elapsed);
    if (controls.mute) {
      initAudio();
      announce(toggleMute() ? 'Audio muted' : 'Audio on');
    }

    if (screen === SCREEN_TITLE) {
      moveSelection(controls, TITLE_ITEM_COUNT);
      if (!controls.confirm) return;
      if (world.menu.index === 0) beginNewGame();
      else if (world.menu.index === 1) loadGame();
      else {
        previousScreen = SCREEN_TITLE;
        screen = SCREEN_CONTROLS;
      }
      return;
    }

    if (screen === SCREEN_CONTROLS) {
      if (controls.confirm || controls.pause) {
        screen = previousScreen;
        announce('Back.');
      }
      return;
    }

    if (screen === SCREEN_PAUSED) {
      moveSelection(controls, PAUSE_ITEM_COUNT);
      if (controls.pause) {
        screen = SCREEN_PLAY;
        announce('Playing.');
        return;
      }
      if (!controls.confirm) return;
      const choice = world.menu.index;
      if (choice === 0) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (choice === 1) {
        previousScreen = SCREEN_PAUSED;
        screen = SCREEN_CONTROLS;
      } else if (choice === 2) {
        announce(saveGame(world) ? 'Game saved.' : 'Storage unavailable.');
        world.toast('Progress saved');
      } else if (choice === 3) {
        loadGame();
        screen = SCREEN_PLAY;
      } else {
        world.hasSave = hasSave();
        world.menu.index = world.hasSave ? 1 : 0;
        screen = SCREEN_TITLE;
      }
      return;
    }

    if (screen === SCREEN_PLAY && controls.pause) {
      world.menu.index = 0;
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  }

  function advanceWorld(controls) {
    let firstStep = true;
    while (accumulator >= STEP) {
      const stepControls = firstStep ? controls : {
        ...controls,
        interact: false,
        interactAlt: false,
        horn: false,
        reload: false,
        confirm: false,
        pause: false,
        mute: false,
        weaponSlot: 0,
        firePressed: false,
      };
      world.step(STEP, stepControls);
      firstStep = false;
      accumulator -= STEP;
      if (screen === SCREEN_OVER && world.endKind === null) {
        screen = SCREEN_PLAY;
        announce('Back on the street.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    elapsed = Math.min((now - lastTime) / 1000, MAX_ELAPSED);
    lastTime = now;
    const controls = input.sample(world.camera);
    handleMenu(controls);

    if (screen === SCREEN_TITLE) {
      world.stepHint += elapsed * 60;
      accumulator = 0;
    } else if (screen === SCREEN_PLAY || screen === SCREEN_OVER) {
      accumulator += elapsed;
      advanceWorld(controls);
      if (screen === SCREEN_PLAY && world.endKind !== null) {
        screen = SCREEN_OVER;
        announce(world.endKind === 'busted' ? 'Busted.' : 'Wasted.');
      }
    } else {
      accumulator = 0;
    }

    renderer.draw(world, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      world.menu.index = 0;
      announce('Paused.');
    }
  });

  requestAnimationFrame(frame);
}

if (shotName !== null) runShot();
else runGame();
