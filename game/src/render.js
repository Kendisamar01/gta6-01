// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Flat
// rectangles and circles, canvas text for the HUD and the panels. Text that holds a number is
// rebuilt only when the number changes, so a frame allocates nothing.
import { FIELD, FONT, LIVES, PALETTE } from './config.js';
import { KIND_COIN } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 600, top: 134, line: 34, bottom: 70 };
const LIFE_SIZE = 20;
const LIFE_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawField(state) {
    context.fillStyle = PALETTE.sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);

    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_COIN) {
        context.fillStyle = PALETTE.coin;
        context.beginPath();
        context.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = PALETTE.block;
        context.fillRect(item.x, item.y, item.width, item.height);
      }
    }

    const player = state.player;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) {
      context.fillStyle = PALETTE.player;
      context.fillRect(player.x, player.y, player.width, player.height);
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 20, 28, PALETTE.text, 'left');
    text(levelLabel(state.level), FIELD.width / 2, 20, 28, PALETTE.text, 'center');
    const firstLife = FIELD.width - 24 - LIVES * (LIFE_SIZE + LIFE_GAP) + LIFE_GAP;
    text('Lives', firstLife - 12, 20, 28, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.player : PALETTE.ground;
      context.fillRect(firstLife + life * (LIFE_SIZE + LIFE_GAP), 24, LIFE_SIZE, LIFE_SIZE);
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.coin, 'center');
  }

  const TITLE_LINES = ['Dodge the red blocks. Catch the gold coins.', 'Move with ← → or A D.  Pause with P.', ''];
  const PAUSED_LINES = ['The blocks will wait for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[2] = bestLabel(best);
      drawPanel('Block Dodger', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Game over', OVER_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

import { SOLARA } from './config.js';

export function createSolaraRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, canvas };
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(window.innerWidth * ratio));
    const height = Math.max(1, Math.round(window.innerHeight * ratio));
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }
  function begin() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0c141d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.save();
    return context;
  }
  function end() {
    context.restore();
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  return { context, view, resize, begin, end };
}

const fontCache = new Map();
export function solaraText(ctx, value, x, y, size, color, align = 'left', baseline = 'alphabetic', weight = '') {
  const key = `${size}|${weight}`;
  if (!fontCache.has(key)) fontCache.set(key, `${weight} ${size}px ${FONT}`.trim());
  ctx.font = fontCache.get(key);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(value, x, y);
}

export function solaraPanel(ctx, x, y, w, h, fill = SOLARA.panel, stroke = SOLARA.accent) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawSolaraTitle(ctx, world) {
  const t = world.elapsed;
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, '#123049');
  sky.addColorStop(0.5, '#33769a');
  sky.addColorStop(0.72, '#f2a35e');
  sky.addColorStop(1, '#f6cf8e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = 'rgba(255,232,166,0.85)';
  ctx.beginPath();
  ctx.arc(978, 246, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20536d';
  for (let i = 0; i < 26; i += 1) {
    const bw = 26 + ((i * 37) % 30);
    const bh = 48 + ((i * 71) % 170);
    ctx.fillRect(i * 52 - 20, 458 - bh, bw, bh);
  }
  ctx.fillStyle = '#163d55';
  ctx.fillRect(0, 455, FIELD.width, 265);
  for (let row = 0; row < 7; row += 1) {
    const y = 462 + row * 38;
    ctx.strokeStyle = `rgba(255,255,255,${0.19 - row * 0.018})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= FIELD.width; x += 16) {
      const wave = Math.sin(x * 0.012 + t * 1.6 + row * 0.7) * (4 + row * 0.6);
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(8,20,28,0.35)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 22;
  solaraText(ctx, 'SOLARA', FIELD.width / 2, 236, 94, SOLARA.text, 'center', 'alphabetic', '800');
  solaraText(ctx, 'BAY', FIELD.width / 2, 328, 94, SOLARA.accent, 'center', 'alphabetic', '800');
  ctx.shadowBlur = 0;
  solaraText(ctx, 'SUN, SPEED AND OTHER BAD DECISIONS', FIELD.width / 2, 374, 20, '#dce9ec', 'center');
  solaraPanel(ctx, 414, 432, 452, 208, 'rgba(10,24,34,0.78)', 'rgba(255,209,102,0.55)');
  const options = ['NEW GAME', 'CONTINUE', 'CONTROLS'];
  for (let i = 0; i < options.length; i += 1) {
    const active = i === (world.menuIndex || 0);
    if (active) {
      ctx.fillStyle = 'rgba(255,209,102,0.16)';
      ctx.fillRect(438, 462 + i * 48, 404, 38);
    }
    solaraText(ctx, options[i], FIELD.width / 2, 488 + i * 48, active ? 24 : 21, active ? SOLARA.accent : '#c7d5d9', 'center', 'alphabetic', active ? '700' : '');
  }
  solaraText(ctx, 'WASD move   MOUSE aim   CLICK attack   E car   ESC menu', FIELD.width / 2, 690, 16, '#c6d5d8', 'center');
}
