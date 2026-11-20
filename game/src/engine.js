import { FIELD, SCREENS, SOLARA, STEP } from './config.js';
import {
  bustPlayer,
  createSolaraWorld,
  damagePlayer,
  formatClock,
  notify,
  respawn,
  stepEnvironment,
  stepPlayer,
} from './world.js';
import { createSolaraInput } from './input.js';
import { createSolaraCamera, cameraOffset, kickCamera, screenToWorld, updateCamera } from './camera.js';
import { createSolaraRenderer, drawSolaraTitle, solaraPanel, solaraText } from './render.js';
import { drawCity } from './city-render.js';
import { drawEntities } from './entity-render.js';
import { drawEnvironment } from './environment.js';
import { stageSolaraShot } from './shots.js';

const OPTIONAL_NAMES = [
  'vehicles', 'traffic', 'peds', 'police', 'wanted', 'combat', 'missions', 'story',
  'effects', 'audio', 'music', 'minimap', 'hud', 'menu', 'save',
];

async function loadSystems() {
  const systems = {};
  await Promise.all(OPTIONAL_NAMES.map(async (name) => {
    try {
      systems[name] = await import(`./${name}.js`);
    } catch {
      systems[name] = null;
    }
  }));
  for (const key of Object.keys(systems)) if (!systems[key]) delete systems[key];
  return systems;
}

function drawMinimalHud(ctx, world) {
  const player = world.player;
  ctx.fillStyle = 'rgba(12,24,34,0.72)';
  ctx.fillRect(18, 18, 258, 92);
  solaraText(ctx, `HP ${Math.ceil(player.health)}`, 32, 48, 16, SOLARA.text, 'left', 'middle', '700');
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(106, 41, 150, 12);
  ctx.fillStyle = SOLARA.danger;
  ctx.fillRect(106, 41, 150 * Math.max(0, player.health / 100), 12);
  solaraText(ctx, `$${player.money}`, 32, 78, 20, SOLARA.money, 'left', 'middle', '700');
  solaraText(ctx, formatClock(world), 258, 78, 16, SOLARA.muted, 'right', 'middle');
  solaraText(ctx, world.area.toUpperCase(), 32, 100, 12, SOLARA.accent, 'left', 'middle', '700');
}

function drawOverlay(ctx, world, systems) {
  if (systems.menu?.draw) {
    systems.menu.draw(ctx, world, systems);
    return;
  }
  if (world.screen === SCREENS.paused) {
    ctx.fillStyle = 'rgba(6,14,22,0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    solaraPanel(ctx, 430, 220, 420, 250);
    solaraText(ctx, 'PAUSED', FIELD.width / 2, 285, 40, SOLARA.text, 'center', 'middle', '800');
    solaraText(ctx, 'ESC  resume', FIELD.width / 2, 350, 20, SOLARA.accent, 'center', 'middle');
    solaraText(ctx, 'ENTER  new game', FIELD.width / 2, 394, 20, SOLARA.muted, 'center', 'middle');
  } else if (world.screen === SCREENS.wasted || world.screen === SCREENS.busted) {
    ctx.fillStyle = 'rgba(30,4,8,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    solaraText(ctx, world.screen === SCREENS.wasted ? 'WASTED' : 'BUSTED', FIELD.width / 2, 330, 76,
      world.screen === SCREENS.wasted ? SOLARA.danger : SOLARA.police, 'center', 'middle', '800');
    solaraText(ctx, 'PRESS ENTER TO RESPAWN', FIELD.width / 2, 410, 22, SOLARA.text, 'center', 'middle');
  } else if (world.controlsOpen) {
    ctx.fillStyle = 'rgba(6,14,22,0.8)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    solaraPanel(ctx, 300, 92, 680, 540);
    solaraText(ctx, 'CONTROLS', FIELD.width / 2, 150, 40, SOLARA.accent, 'center', 'middle', '800');
    const lines = [
      'WASD / ARROWS      walk or steer',
      'SHIFT              run / accelerate',
      'SPACE              handbrake',
      'MOUSE              aim and look',
      'LEFT CLICK         punch, shoot or horn',
      'E / F              enter and exit vehicles',
      'R                  reload',
      'H                  horn',
      'Q                  side activity',
      'M                  mute audio',
      'TAB                map',
      'ESC                pause and menu',
    ];
    for (let index = 0; index < lines.length; index += 1) {
      solaraText(ctx, lines[index], 350, 210 + index * 34, 18, index % 2 ? SOLARA.muted : SOLARA.text, 'left', 'middle');
    }
    solaraText(ctx, 'PRESS ESC TO CLOSE', FIELD.width / 2, 600, 17, SOLARA.accent, 'center', 'middle');
  }
}

export async function bootSolara() {
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');
  const renderer = createSolaraRenderer(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
  const seed = Number.isInteger(seedParam) ? seedParam : 20261120;
  const world = createSolaraWorld(seed);
  const camera = createSolaraCamera(world.city.bounds);
  const input = createSolaraInput(canvas);
  const nativeRaf = window.requestAnimationFrame.bind(window);
  window.__solaraActive = true;
  window.requestAnimationFrame = () => 0;
  const systems = await loadSystems();
  let loopHandle = 0;
  let last = performance.now();
  let accumulator = 0;

  const api = {
    world,
    camera,
    input,
    renderer,
    systems,
    seed,
    shot,
    notify: (message, kind) => notify(world, message, kind),
    kick: (amount) => kickCamera(camera, amount),
    damage: (amount, cause) => damagePlayer(world, amount, cause),
    bust: () => bustPlayer(world),
    announce: (message) => { if (status) status.textContent = message; },
    nativeRaf,
  };

  function announce(message) {
    if (status) status.textContent = message;
  }

  function installWorld() {
    if (window.__solaraSystemBinder) window.__solaraSystemBinder(world, systems, api);
    systems.vehicles?.populate?.(world);
    systems.peds?.populate?.(world);
    systems.missions?.init?.(world, api);
    systems.combat?.init?.(world, api);
    systems.audio?.init?.(api);
    systems.music?.init?.(api);
  }

  function restart(useSave = false) {
    if (useSave && systems.save?.load) {
      const loaded = systems.save.load(world);
      if (!loaded) {
        notify(world, 'No saved game found', 'warn');
        return;
      }
    } else {
      const fresh = createSolaraWorld(seed);
      for (const key of Object.keys(world)) delete world[key];
      Object.assign(world, fresh);
    }
    world.screen = SCREENS.play;
    installWorld();
    camera.ready = false;
    announce('Welcome to Solara Bay.');
  }

  api.restart = restart;
  window.__solara = api;

  function step(dt) {
    stepEnvironment(world, dt);
    if (systems.menu?.step) systems.menu.step(world, dt);
    if (world.screen === SCREENS.title) {
      world.player.vx = 0;
      world.player.vy = 0;
      world.player.aimX = 640;
      world.player.aimY = 360;
      systems.music?.update?.(world, dt);
      return;
    }
    if (world.screen !== SCREENS.play) {
      systems.music?.update?.(world, dt);
      return;
    }
    const move = input.moveVector();
    const aim = screenToWorld(camera, input.mouse.x, input.mouse.y);
    const controls = {
      mx: move.mx,
      my: move.my,
      run: input.any(['ShiftLeft', 'ShiftRight']),
      handbrake: input.any(['Space']),
      fire: input.mouse.down,
      aimX: aim.x,
      aimY: aim.y,
    };
    stepPlayer(world, controls, dt);
    systems.vehicles?.update?.(world, dt, controls, api);
    systems.traffic?.update?.(world, dt, api);
    systems.peds?.update?.(world, dt, api);
    systems.combat?.update?.(world, dt, controls, api);
    systems.wanted?.update?.(world, dt, api);
    systems.police?.update?.(world, dt, api);
    systems.missions?.update?.(world, dt, api);
    systems.effects?.update?.(world, dt, api);
    systems.music?.update?.(world, dt);
    const target = world.player.inVehicle !== null
      ? world.vehicles.find((car) => car.id === world.player.inVehicle) || world.player
      : world.player;
    updateCamera(camera, target, dt, target === world.player ? 0.28 : 0.45);
    for (const event of world.events) {
      systems.audio?.event?.(event, world);
      systems.effects?.event?.(event, world, api);
      systems.save?.event?.(event, world);
      if (event.type === 'area') announce(`${event.area}. ${formatClock(world)}.`);
      if (event.type === 'wasted') announce('Wasted. Press Enter to respawn.');
      if (event.type === 'busted') announce('Busted. Press Enter to respawn.');
    }
    world.events.length = 0;
  }

  function paint() {
    const ctx = renderer.context;
    const view = renderer.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b131b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (world.screen === SCREENS.title) {
      drawSolaraTitle(ctx, world);
      systems.minimap?.drawTitle?.(ctx, world);
      return;
    }
    const offset = cameraOffset(camera);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    drawCity(ctx, world, camera);
    drawEntities(ctx, world, camera);
    systems.effects?.drawWorld?.(ctx, world, camera);
    ctx.restore();
    drawEnvironment(ctx, world, camera);
    systems.minimap?.draw?.(ctx, world, camera);
    systems.hud?.draw?.(ctx, world, api);
    if (!systems.hud) drawMinimalHud(ctx, world);
    drawOverlay(ctx, world, systems);
  }

  api.step = step;
  api.paint = paint;

  function handleKey(code) {
    systems.menu?.key?.(code, world, api);
    if (world.menuConsumed) {
      world.menuConsumed = false;
      return;
    }
    systems.audio?.key?.(code, world, api);
    systems.combat?.key?.(code, world, api);
    systems.missions?.key?.(code, world, api);
    systems.vehicles?.key?.(code, world, api);
    if (code === 'KeyM') {
      world.muted = !world.muted;
      systems.audio?.mute?.(world.muted);
      notify(world, world.muted ? 'Audio muted' : 'Audio on');
      return;
    }
    if (world.controlsOpen) {
      if (code === 'Escape' || code === 'Enter') world.controlsOpen = false;
      return;
    }
    if (world.screen === SCREENS.title) {
      if (code === 'KeyW' || code === 'ArrowUp') world.menuIndex = (world.menuIndex + 2) % 3;
      else if (code === 'KeyS' || code === 'ArrowDown') world.menuIndex = (world.menuIndex + 1) % 3;
      else if (code === 'Enter' || code === 'Space') {
        if (world.menuIndex === 2) world.controlsOpen = true;
        else restart(world.menuIndex === 1);
      }
      return;
    }
    if (world.screen === SCREENS.paused) {
      if (code === 'Escape' || code === 'KeyP') world.screen = SCREENS.play;
      else if (code === 'Enter') restart(false);
      return;
    }
    if (world.screen === SCREENS.wasted || world.screen === SCREENS.busted) {
      if (code === 'Enter' || code === 'Space') {
        respawn(world, world.screen === SCREENS.busted);
        world.flash = 0;
      }
      return;
    }
    if (code === 'Escape' || code === 'KeyP') {
      world.screen = SCREENS.paused;
      announce('Paused.');
    }
  }

  function handleInput() {
    const keys = input.takePressed();
    for (const code of keys) handleKey(code);
  }

  function frame(now) {
    loopHandle = nativeRaf(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    handleInput();
    while (accumulator >= STEP) {
      step(STEP);
      accumulator -= STEP;
    }
    paint();
  }

  function startLoop() {
    if (loopHandle) return;
    last = performance.now();
    loopHandle = nativeRaf(frame);
  }

  api.startLoop = startLoop;
  api.handleKey = handleKey;

  installWorld();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === SCREENS.play) world.screen = SCREENS.paused;
  });

  if (shot) {
    stageSolaraShot(shot, api);
    paint();
    nativeRaf(() => {
      paint();
      window.__modulesReady = true;
      window.__shotReady = true;
    });
  } else {
    announce('Solara Bay. Press Enter to begin.');
    startLoop();
  }
  return api;
}
