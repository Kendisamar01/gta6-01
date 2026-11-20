import { FONT } from './config.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE } from './input.js';
import { SCREEN_PLAY, SCREEN_PAUSED, SCREEN_TITLE } from './render.js';
import { clearSave, hasSave, loadGame, saveGame } from './save.js';

const PANEL = { x: 292, y: 150, width: 696, height: 500 };
const TITLE_ITEMS = [
  { label: 'New Game', action: 'new' },
  { label: 'Continue', action: 'continue' },
  { label: 'Controls', action: 'controls' },
];
const PAUSE_ITEMS = [
  { label: 'Resume', action: 'resume' },
  { label: 'Controls', action: 'controls' },
  { label: 'Save Game', action: 'save' },
  { label: 'Load Game', action: 'load' },
  { label: 'Quit to Title', action: 'title' },
];
const CONTROLS = [
  'WASD / arrows  move and steer',
  'Shift  run or handbrake',
  'Mouse  aim   ·   Left click  punch or fire',
  'E / F  enter or exit a vehicle, talk, continue',
  'H  horn   ·   R  reload   ·   M  mute audio',
  'Escape / P  pause   ·   Space / Enter  confirm',
];

let active = null;

function text(ctx, value, x, y, size, color, align) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

export function createMenu(context) {
  const menu = { index: 0, controls: false, notice: '', noticeLife: 0, click: null };
  const nav = { up: 0, down: 0 };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'ArrowUp' || event.code === 'KeyW') nav.up += 1;
    else if (event.code === 'ArrowDown' || event.code === 'KeyS') nav.down += 1;
  });
  window.addEventListener('pointerdown', (event) => {
    if (!context.renderer || !context.renderer.clientToField) return;
    menu.click = context.renderer.clientToField(event.clientX, event.clientY);
  });

  function itemsFor(screen) {
    return screen === SCREEN_TITLE ? TITLE_ITEMS : PAUSE_ITEMS;
  }

  function beep(name) {
    const audio = context.systems && context.systems.audio;
    if (audio && audio.play) audio.play(name || 'blip');
  }

  function note(message, kind) {
    menu.notice = message;
    menu.noticeLife = 3.8;
    const hud = context.systems && context.systems.hud;
    if (hud && hud.toast) hud.toast(message, kind || 'info');
    if (context.announce) context.announce(message);
  }

  function rowBounds(index, count) {
    const gap = count > 4 ? 52 : 62;
    const top = PANEL.y + 202 + index * gap;
    return { x: PANEL.x + 72, y: top - 32, width: PANEL.width - 144, height: 44 };
  }

  function rowAt(point, count) {
    for (let index = 0; index < count; index += 1) {
      const row = rowBounds(index, count);
      if (point.x >= row.x && point.x <= row.x + row.width && point.y >= row.y && point.y <= row.y + row.height) return index;
    }
    return -1;
  }

  function play() {
    context.world.reset();
    if (context.camera && context.camera.snap) context.camera.snap(context.world.player.x, context.world.player.y);
    menu.index = 0;
    context.setScreen(SCREEN_PLAY);
    if (context.announce) context.announce('Welcome to Solara Bay. Find Marco in Palmside.');
  }

  function activate(action) {
    if (action === 'new') {
      clearSave();
      play();
      note('New game. The bay is yours.', 'good');
      return;
    }
    if (action === 'continue') {
      if (!hasSave()) {
        note('No saved game yet. Start a new one.', 'warn');
        return;
      }
      if (loadGame()) {
        menu.index = 0;
        context.setScreen(SCREEN_PLAY);
        note('Save loaded. Welcome back.', 'good');
      } else {
        note('That save could not be read.', 'danger');
      }
      return;
    }
    if (action === 'controls') {
      menu.controls = true;
      menu.notice = '';
      return;
    }
    if (action === 'resume') {
      context.setScreen(SCREEN_PLAY);
      if (context.announce) context.announce('Back in the city.');
      return;
    }
    if (action === 'save') {
      const saved = saveGame();
      note(saved ? 'Game saved in this browser.' : 'Saving is unavailable here.', saved ? 'good' : 'danger');
      return;
    }
    if (action === 'load') {
      if (loadGame()) {
        context.setScreen(SCREEN_PLAY);
        note('Save loaded. Welcome back.', 'good');
      } else {
        note('No usable save found.', 'warn');
      }
      return;
    }
    if (action === 'title') {
      menu.index = 0;
      menu.notice = '';
      context.setScreen(SCREEN_TITLE);
      if (context.announce) context.announce('Solara Bay. Choose New Game or Continue.');
    }
  }

  function consume(actions, screen) {
    const open = screen === SCREEN_TITLE || screen === SCREEN_PAUSED;
    if (!open) {
      nav.up = 0;
      nav.down = 0;
      menu.click = null;
      return false;
    }
    if (actions & ACTION_MUTE) return false;
    if (menu.controls) {
      menu.click = null;
      if (actions & (ACTION_CONFIRM | ACTION_PAUSE)) {
        menu.controls = false;
        beep();
      }
      return true;
    }
    const items = itemsFor(screen);
    const click = menu.click;
    menu.click = null;
    if (click) {
      const hit = rowAt(click, items.length);
      if (hit >= 0) {
        menu.index = hit;
        activate(items[hit].action);
        beep();
      }
      return true;
    }
    if (nav.up) {
      nav.up = 0;
      menu.index = (menu.index + items.length - 1) % items.length;
      beep();
      return true;
    }
    if (nav.down) {
      nav.down = 0;
      menu.index = (menu.index + 1) % items.length;
      beep();
      return true;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PAUSED) {
        context.setScreen(SCREEN_PLAY);
        if (context.announce) context.announce('Back in the city.');
        beep();
      }
      return true;
    }
    if (actions & ACTION_CONFIRM) {
      activate(items[menu.index].action);
      beep();
    }
    return true;
  }

  function draw(ctx, frame) {
    if (frame.screen !== SCREEN_TITLE && frame.screen !== SCREEN_PAUSED) return;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 17, 29, 0.97)';
    ctx.fillRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height);
    ctx.strokeStyle = '#f0c978';
    ctx.lineWidth = 3;
    ctx.strokeRect(PANEL.x + 5, PANEL.y + 5, PANEL.width - 10, PANEL.height - 10);
    ctx.fillStyle = 'rgba(240, 201, 120, 0.45)';
    ctx.fillRect(PANEL.x + 72, PANEL.y + 160, PANEL.width - 144, 2);

    const center = PANEL.x + PANEL.width / 2;
    text(ctx, 'SOLARA BAY', center, PANEL.y + 104, 54, '#ffd77a', 'center');
    text(ctx, frame.screen === SCREEN_TITLE ? 'Open world. Open secrets.' : 'The city can wait.', center, PANEL.y + 138, 19, '#c6d7dd', 'center');

    if (menu.controls) {
      for (let index = 0; index < CONTROLS.length; index += 1) {
        text(ctx, CONTROLS[index], PANEL.x + 78, PANEL.y + 210 + index * 38, 18, '#e8eef1', 'left');
      }
      text(ctx, 'Enter or Escape  back', center, PANEL.y + PANEL.height - 42, 17, '#f5e2a8', 'center');
      ctx.restore();
      return;
    }

    const items = itemsFor(frame.screen);
    for (let index = 0; index < items.length; index += 1) {
      const row = rowBounds(index, items.length);
      const chosen = index === menu.index;
      ctx.fillStyle = chosen ? 'rgba(240, 201, 120, 0.24)' : 'rgba(255, 255, 255, 0.045)';
      ctx.fillRect(row.x, row.y, row.width, row.height);
      if (chosen) {
        ctx.strokeStyle = 'rgba(255, 226, 153, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(row.x + 1, row.y + 1, row.width - 2, row.height - 2);
      }
      text(ctx, items[index].label, row.x + 22, row.y + 29, 23, chosen ? '#ffe7a8' : '#dbe5ea', 'left');
      if (items[index].action === 'continue' && !hasSave()) {
        text(ctx, 'no save', row.x + row.width - 18, row.y + 28, 14, '#93a3ac', 'right');
      }
    }

    if (menu.noticeLife > 0) {
      text(ctx, menu.notice, center, PANEL.y + PANEL.height - 62, 17, '#ffd27a', 'center');
    } else {
      text(ctx, 'W / S choose   ·   Enter or click select   ·   Esc back', center, PANEL.y + PANEL.height - 62, 15, '#9fb1bb', 'center');
    }
    ctx.restore();
  }

  function step(dt) {
    if (menu.noticeLife > 0) menu.noticeLife = Math.max(0, menu.noticeLife - dt);
  }

  return { menu, consume, draw, step, activate };
}

export function install(context) {
  active = createMenu(context);
  context.systems.menu = active;
}

export function menuConsume(actions, screen) {
  return active ? active.consume(actions, screen) : false;
}

export function menuDraw(ctx, frame) {
  if (active) active.draw(ctx, frame);
}

export function menuStep(dt) {
  if (active) active.step(dt);
}
