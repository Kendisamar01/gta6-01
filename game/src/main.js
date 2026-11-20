import { TICK } from './config.js';
import { createWorld } from './world.js';
import { idle, makeInput } from './input.js';
import {
  createRenderer, SCREEN_CONTROLS, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';
import { initAudio, toggleMute } from './audio.js';
import { applySave, hasSave, readSave, saveGame } from './save.js';
import { PAUSE_ITEM_COUNT, TITLE_ITEM_COUNT } from './menu.js';
import { OPENING_LINES } from './story.js';

const MAX_ELAPSED = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const askedSeed = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(askedSeed) ? askedSeed : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
let world = createWorld(seed, { silent: shot !== null });
const renderer = createRenderer(canvas);

function announce(message) {
  if (status !== null) status.textContent = message;
}

function runShot() {
  const screen = stageShot(shot, world);
  let frames = 0;
  function paint() {
    renderer.draw(world, screen);
    frames += 1;
    if (frames < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = makeInput(canvas);
  let screen = SCREEN_TITLE;
  let returnScreen = SCREEN_PLAY;
  let accumulator = 0;
  let last = performance.now();
  let menuWait = 0;
  let elapsed = 0;

  world.hasSave = hasSave();
  world.menu.index = world.hasSave ? 1 : 0;
  announce('Solara Bay. Choose New Game or Continue.');

  window.addEventListener('keydown', initAudio, { once: true });
  canvas.addEventListener('pointerdown', initAudio, { once: true });

  function newGame() {
    world = createWorld(seed);
    world.openTalk(OPENING_LINES, () => world.notify('Welcome to Solara Bay'));
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('New game started. Follow the marker to Cafe Astra.');
  }

  function continueGame() {
    const data = readSave();
    if (data === null) {
      world.notify('No saved game found');
      return;
    }
    world = createWorld(data.seed ?? seed);
    applySave(world, data);
    world.hasSave = true;
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Saved game loaded.');
  }

  function moveMenu(controls, count) {
    if (menuWait > 0 || controls.y === 0) return;
    const direction = controls.y > 0 ? 1 : -1;
    let next = world.menu.index;
    for (let i = 0; i < count; i += 1) {
      next = (next + direction + count) % count;
      if (screen !== SCREEN_TITLE || next !== 1 || world.hasSave) break;
    }
    world.menu.index = next;
    menuWait = 0.16;
    world.sound('ui');
  }

  function handleMenu(controls) {
    menuWait = Math.max(0, menuWait - elapsed);
    if (controls.mute) {
      initAudio();
      announce(toggleMute() ? 'Audio muted' : 'Audio on');
    }

    if (screen === SCREEN_TITLE) {
      moveMenu(controls, TITLE_ITEM_COUNT);
      if (!controls.confirm) return;
      if (world.menu.index === 0) newGame();
      else if (world.menu.index === 1) continueGame();
      else {
        returnScreen = SCREEN_TITLE;
        screen = SCREEN_CONTROLS;
      }
      return;
    }

    if (screen === SCREEN_CONTROLS) {
      if (controls.confirm || controls.pause) {
        screen = returnScreen;
        announce('Back.');
      }
      return;
    }

    if (screen === SCREEN_PAUSED) {
      moveMenu(controls, PAUSE_ITEM_COUNT);
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
        returnScreen = SCREEN_PAUSED;
        screen = SCREEN_CONTROLS;
      } else if (choice === 2) {
        announce(saveGame(world) ? 'Game saved.' : 'Storage unavailable.');
        world.notify('Progress saved');
      } else if (choice === 3) {
        continueGame();
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
    let first = true;
    while (accumulator >= TICK) {
      const orders = first ? controls : idle({
        x: controls.x,
        y: controls.y,
        run: controls.run,
        brake: controls.brake,
        fire: controls.fire,
        aimX: controls.aimX,
        aimY: controls.aimY,
        pointerX: controls.pointerX,
        pointerY: controls.pointerY,
      });
      world.step(TICK, orders);
      first = false;
      accumulator -= TICK;
      if (screen === SCREEN_OVER && world.endKind === null) {
        screen = SCREEN_PLAY;
        announce('Back on the street.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    elapsed = Math.min((now - last) / 1000, MAX_ELAPSED);
    last = now;
    const controls = input.sample(world.camera);
    handleMenu(controls);

    if (screen === SCREEN_TITLE) {
      world.tickHint += elapsed * 60;
      accumulator = 0;
    } else if (screen === SCREEN_PLAY || screen === SCREEN_OVER) {
      accumulator += elapsed;
      advanceWorld(controls);
      if (screen === SCREEN_PLAY && world.endKind !== null) {
        screen = SCREEN_OVER;
        announce(world.endKind === 'busted' ? 'Busted.' : 'Wasted.');
      }
    } else accumulator = 0;

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

if (shot !== null) runShot();
else runGame();
