import { MAX_FRAME, STEP } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createCamera } from './camera.js';
import { createEnvironment } from './environment.js';
import { createWorld, EVENT_DEAD, EVENT_RESPAWN } from './world.js';
import { EVENT_BUSTED } from './world.js';
import { createEffects } from './effects.js';
import { createVehicles } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPeds } from './peds.js';
import { createPolice } from './police.js';
import { createWanted } from './wanted.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createAudio } from './audio.js';
import { createMusic } from './music.js';
import { createMinimap } from './minimap.js';
import { createHud } from './hud.js';
import { createSave } from './save.js';
import { createMenu } from './menu.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const parsedSeed = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(parsedSeed) ? parsedSeed : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const city = createCity(createRandom(seed));
const camera = createCamera();
const environment = createEnvironment();
const world = createWorld(city, camera, createRandom(seed ^ 0x51f0d2a7), seed);
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const ui = { selection: 0, controls: false, notice: '', sideIndex: -1 };

const audio = createAudio(world);
const music = createMusic(audio);
const effects = createEffects(world, camera);
const vehicles = createVehicles(world);
const traffic = createTraffic(world);
const peds = createPeds(world);
const wanted = createWanted(world);
const combat = createCombat(world);
const police = createPolice(world);
const missions = createMissions(world);
const minimap = createMinimap(world);
const hud = createHud(world, minimap, audio);
const save = createSave(world);
const menu = createMenu(world, renderer, save);

world.environment = environment;
world.systems.audio = audio;
world.systems.music = music;
world.systems.effects = effects;
world.systems.vehicles = vehicles;
world.systems.traffic = traffic;
world.systems.peds = peds;
world.systems.wanted = wanted;
world.systems.combat = combat;
world.systems.police = police;
world.systems.missions = missions;
world.systems.hud = true;
world.systems.menu = menu;
world.systems.save = save;
world.systems.resetAll = () => {
  effects.reset();
  music.reset();
  combat.reset();
  vehicles.reset();
  traffic.reset();
  peds.reset();
  police.reset();
  wanted.reset();
  missions.reset();
};

renderer.worldLayers.push(effects.drawWorld);
renderer.overlays.push(hud.draw);
world.systems.resetAll();

function announce(message) {
  statusLine.textContent = message;
}

function runShot(name) {
  const screen = stageShot(name, world);
  environment.setTime(name === 'chase' ? 0.73 : 0.34);
  let paints = 0;
  function paint() {
    renderer.draw(world, camera, environment, screen, ui);
    paints += 1;
    if (paints < 2) {
      requestAnimationFrame(paint);
    } else {
      window.__shotReady = true;
      window.__shotData = canvas.toDataURL('image/jpeg', 0.88);
      const carrier = document.createElement('pre');
      carrier.id = 'shot-data';
      carrier.textContent = window.__shotData.split(',')[1] ?? '';
      document.body.appendChild(carrier);
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let previous = performance.now();

  function optionsFor(screenName) {
    if (screenName === SCREEN_TITLE) return renderer.TITLE_OPTIONS;
    if (screenName === SCREEN_PAUSED) return renderer.PAUSE_OPTIONS;
    return [];
  }

  function choose(index) {
    if (screen === SCREEN_TITLE) {
      if (index === 0) {
        world.reset();
        screen = SCREEN_PLAY;
        announce('New game started in Solara Bay.');
      } else if (index === 2) {
        ui.controls = !ui.controls;
      }
    } else if (screen === SCREEN_PAUSED) {
      if (index === 0) screen = SCREEN_PLAY;
      else if (index === 2) screen = SCREEN_TITLE;
      else if (index === 1) ui.controls = !ui.controls;
    }
  }

  function applyMenuCommand(command) {
    if (command === 'new') {
      world.reset();
      screen = SCREEN_PLAY;
      ui.selection = 0;
      announce('New game started in Solara Bay.');
    } else if (command === 'continue' || command === 'load') {
      world.reset();
      if (save.load()) screen = SCREEN_PLAY;
      ui.selection = 0;
      announce('Save loaded.');
    } else if (command === 'resume') {
      screen = SCREEN_PLAY;
    } else if (command === 'save') {
      save.save();
    } else if (command === 'quit') {
      screen = SCREEN_TITLE;
      ui.selection = 0;
    } else if (command === 'controls') {
      ui.controls = !ui.controls;
    } else if (command === 'escape') {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      ui.controls = false;
    }
  }

  function handleActions() {
    const menuCommand = menu.handle(input, ui, screen);
    if (menuCommand) {
      applyMenuCommand(menuCommand);
      return;
    }
    const options = optionsFor(screen);
    if (input.pressed('ArrowUp') || input.pressed('KeyW')) {
      ui.selection = (ui.selection - 1 + options.length) % Math.max(1, options.length);
    }
    if (input.pressed('ArrowDown') || input.pressed('KeyS')) {
      ui.selection = (ui.selection + 1) % Math.max(1, options.length);
    }
    if (input.pressed('Enter') || input.pressed('Space')) choose(ui.selection);
    if (input.pressed('Escape')) {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      ui.controls = false;
    }
    if (screen === SCREEN_OVER && input.pressed('Enter')) {
      screen = SCREEN_PLAY;
      announce('Back on the streets.');
    }
    if (input.mouse.clicked || input.pressed('Enter') || input.pressed('Space') || input.pressed('KeyE') || input.pressed('KeyF')) audio.unlock();
    if (input.pressed('KeyM')) audio.toggleMute();
    if (screen === SCREEN_PLAY) {
      if (input.pressed('KeyE') || input.pressed('KeyF')) {
        if (!wanted.tryGarage()) vehicles.enter();
      }
      if (input.pressed('KeyQ')) {
        ui.sideIndex = (ui.sideIndex + 1) % 3;
        missions.startSide(['taxi', 'rampage', 'courier'][ui.sideIndex]);
      }
    }
    if (options.length === 0) ui.selection = 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - previous) / 1000, MAX_FRAME);
    previous = now;
    handleActions();

    const aimPoint = camera.toWorld(input.mouse.x, input.mouse.y);
    const player = world.state.player;
    const control = {
      move: screen === SCREEN_PLAY ? input.movement() : { x: 0, y: 0, run: false },
      aim: Math.atan2(aimPoint.y - player.y, aimPoint.x - player.x),
      shoot: screen === SCREEN_PLAY && input.mouse.down,
      click: screen === SCREEN_PLAY && input.mouse.clicked,
      handbrake: screen === SCREEN_PLAY && input.down('Space'),
      horn: screen === SCREEN_PLAY && input.down('KeyH'),
      reload: screen === SCREEN_PLAY && input.pressed('KeyR'),
      weapon: screen === SCREEN_PLAY ? (input.pressed('Digit1') ? 1 : input.pressed('Digit2') ? 2 : input.pressed('Digit3') ? 3 : 0) : 0,
    };

    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        environment.update(STEP);
        camera.update(STEP);
        if (screen === SCREEN_PLAY) {
          const events = world.step(STEP, control);
          if (events & EVENT_DEAD) {
            screen = SCREEN_OVER;
            announce('Wasted. Press Enter to respawn.');
          }
          if (events & EVENT_RESPAWN) announce('Back on the streets.');
          if (events & EVENT_BUSTED) announce('Busted. Police booked you.');
        }
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    renderer.draw(world, camera, environment, screen, ui);
    input.endFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });

  announce('Solara Bay. Press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shotName) runShot(shotName);
else runGame();
