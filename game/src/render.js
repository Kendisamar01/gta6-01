import { CITY_NAME, COLORS, FIELD, FONT, PALETTE } from './config.js';
import { drawCity } from './city-render.js';
import { drawPlayer } from './entity-render.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 620, height: 250 };

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

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

  function bar(x, y, width, height, amount, color) {
    context.fillStyle = 'rgba(16, 22, 30, 0.72)';
    context.fillRect(x, y, width, height);
    context.fillStyle = color;
    context.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * Math.min(1, Math.max(0, amount))), height - 4);
    context.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  function basicHud(state) {
    context.textBaseline = 'top';
    context.fillStyle = 'rgba(16, 22, 30, 0.66)';
    context.fillRect(16, 14, 258, 84);
    bar(28, 26, 150, 12, state.player.health / 100, '#e2584c');
    bar(28, 44, 150, 10, state.player.armor / 100, '#62a9d8');
    text(`${Math.max(0, Math.round(state.player.health))}`, 186, 22, 17, PALETTE.text, 'left');
    text(`$${Math.max(0, Math.round(state.player.cash))}`, 28, 62, 21, '#f2c94c', 'left');
    text(state.weapon || 'fists', 126, 64, 16, PALETTE.muted, 'left');
    text(state.area, FIELD.width / 2, 22, 22, PALETTE.text, 'center');
    context.textBaseline = 'bottom';
    text('WASD walk  SHIFT run  MOUSE aim  ESC pause', 20, FIELD.height - 16, 15, 'rgba(255,255,255,0.82)', 'left');
    text(state.environment.state.clock, FIELD.width - 20, FIELD.height - 16, 15, 'rgba(255,255,255,0.82)', 'right');
  }

  function titleArt(state) {
    context.fillStyle = 'rgba(11, 18, 34, 0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const sun = context.createLinearGradient(0, 130, 0, 340);
    sun.addColorStop(0, '#ffd77a');
    sun.addColorStop(1, '#f0785e');
    context.fillStyle = sun;
    context.beginPath();
    context.arc(FIELD.width / 2, 226, 104, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(11, 18, 34, 0.55)';
    for (let index = 0; index < 5; index += 1) {
      context.fillRect(FIELD.width / 2 - 104, 234 + index * 18, 208, 6 + index * 2);
    }
    context.textBaseline = 'alphabetic';
    text(CITY_NAME.toUpperCase(), FIELD.width / 2, 214, 74, '#fff6dc', 'center');
    text('A sun-soaked city with nowhere to hide', FIELD.width / 2, 372, 23, '#f5e3c8', 'center');
    text('WASD to walk  ·  SHIFT to run  ·  MOUSE to look around', FIELD.width / 2, 430, 18, '#d6e4ec', 'center');
    text('Press SPACE or click to explore', FIELD.width / 2, 500, 25, '#ffd77a', 'center');
  }

  function panel(heading, line, prompt) {
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - PANEL.height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, PANEL.height);
    context.strokeStyle = '#f2c94c';
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, PANEL.width - 2, PANEL.height - 2);
    context.textBaseline = 'alphabetic';
    text(heading, FIELD.width / 2, y + 88, 44, PALETTE.text, 'center');
    text(line, FIELD.width / 2, y + 146, 21, PALETTE.muted, 'center');
    text(prompt, FIELD.width / 2, y + 208, 22, PALETTE.coin, 'center');
  }

  function draw(state, screen, best, extras) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const camera = state.camera.state;
    const shake = state.camera.offset();
    context.save();
    context.translate(FIELD.width / 2 - camera.x + shake.x, FIELD.height / 2 - camera.y + shake.y);
    drawCity(context, state.city, camera, state.environment.state, state.elapsed);
    if (extras && extras.entities) {
      for (let index = 0; index < extras.entities.length; index += 1) extras.entities[index](context, state);
    }
    drawPlayer(context, state.player, state.environment.state);
    context.restore();
    const daylight = state.environment.state.daylight;
    if (daylight < 1) {
      context.fillStyle = `rgba(18, 28, 62, ${((1 - daylight) * 0.5).toFixed(3)})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (extras && extras.hud) {
      for (let index = 0; index < extras.hud.length; index += 1) extras.hud[index](context, state);
    } else if (screen !== SCREEN_TITLE) {
      basicHud(state);
    }
    if (screen === SCREEN_TITLE) titleArt(state);
    else if (screen === SCREEN_PAUSED) panel('Taking a breather', 'The city waits right where you left it.', 'Press ESC or SPACE to carry on');
    else if (screen === SCREEN_OVER) panel('Wasted', `Your last score was ${Math.round(state.score)}.`, 'Press SPACE to start again');
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize, view };
}

export const createGameRenderer = createRenderer;
