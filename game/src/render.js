// Drawing only: world state, camera, time-of-day mood and the current screen go in; pixels come out.
// The 1280x720 logical area is scaled to the window and centred, as before. The city and its people
// are painted through the camera transform, while the HUD and panels stay fixed to the screen.
import { FIELD, FONT, PALETTE } from './config.js';
import { drawCity } from './city-render.js';
import { drawEntities } from './entity-render.js';
import { drawEffects } from './effects.js';
import { drawPickups } from './combat.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const fonts = new Map();

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

  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function clientToField(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const px = (clientX - bounds.left) * (canvas.width / bounds.width) / ratio;
    const py = (clientY - bounds.top) * (canvas.height / bounds.height) / ratio;
    return { x: (px * ratio - view.x) / view.scale, y: (py * ratio - view.y) / view.scale };
  }

  function bar(x, y, width, height, fraction, color) {
    context.fillStyle = 'rgba(12, 18, 26, 0.65)';
    context.fillRect(x - 2, y - 2, width + 4, height + 4);
    context.fillStyle = '#52606a';
    context.fillRect(x, y, width, height);
    context.fillStyle = color;
    context.fillRect(x, y, width * Math.max(0, Math.min(1, fraction)), height);
  }

  function drawHud(state, environment) {
    const player = state.player;
    bar(24, 24, 176, 12, player.health / 100, '#e05b52');
    bar(24, 42, 176, 9, player.armor / 100, '#5cb8e0');
    text(`${Math.ceil(player.health)} HP`, 24, 78, 16, PALETTE.text, 'left');
    text(`$${Math.floor(player.money)}`, 24, 104, 22, '#ffe08a', 'left');

    let stars = '';
    for (let index = 0; index < 5; index += 1) stars += index < player.wanted ? '★' : '☆';
    text(stars, FIELD.width - 24, 46, 24, '#ffd25e', 'right');
    text(environment.timeLabel(), FIELD.width - 24, 74, 16, PALETTE.text, 'right');

    context.fillStyle = 'rgba(12, 18, 26, 0.66)';
    context.fillRect(24, FIELD.height - 72, 310, 48);
    text(state.area, 38, FIELD.height - 46, 24, '#fff0d0', 'left');
    text(state.street, 38, FIELD.height - 28, 14, '#c8d3d8', 'left');

    if (state.message) {
      context.fillStyle = 'rgba(12, 18, 26, 0.72)';
      const width = Math.max(260, state.message.length * 10 + 40);
      context.fillRect((FIELD.width - width) / 2, 96, width, 36);
      text(state.message, FIELD.width / 2, 121, 18, '#fff0d0', 'center');
    }

    text('WASD move  ·  Shift run  ·  E enter  ·  Mouse aim  ·  Click punch', FIELD.width - 24, FIELD.height - 24, 14, 'rgba(240,245,250,0.8)', 'right');
  }

  function drawCrosshair(aim) {
    if (!aim) return;
    context.strokeStyle = 'rgba(255, 245, 215, 0.85)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(aim.x - 10, aim.y);
    context.lineTo(aim.x - 3, aim.y);
    context.moveTo(aim.x + 3, aim.y);
    context.lineTo(aim.x + 10, aim.y);
    context.moveTo(aim.x, aim.y - 10);
    context.lineTo(aim.x, aim.y - 3);
    context.moveTo(aim.x, aim.y + 3);
    context.lineTo(aim.x, aim.y + 10);
    context.stroke();
  }

  function drawPanel(title, lines, prompt) {
    const width = 660;
    const height = 330;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(14, 24, 38, 0.82)';
    context.fillRect(x, y, width, height);
    context.strokeStyle = '#f0c978';
    context.lineWidth = 3;
    context.strokeRect(x + 4, y + 4, width - 8, height - 8);
    text(title, FIELD.width / 2, y + 100, 58, '#ffd77a', 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 160 + index * 32, 20, PALETTE.text, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 44, 24, '#f5e2a8', 'center');
  }

  function draw(world, cameraView, environment, screen, aim) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0b1726';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, environment.skyTop());
    sky.addColorStop(1, environment.skyBottom());
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    cameraView.begin(context);
    drawCity(context, world.city, cameraView.camera, environment, world.state.elapsed);
    drawEntities(context, world.state, environment, world.state.elapsed);
    drawPickups(context, world.state, world.state.elapsed);
    drawEffects(context, world.state, world.state.elapsed);
    cameraView.end(context);
    environment.overlay(context);

    if (screen === SCREEN_TITLE) {
      drawPanel('SOLARA BAY', ['A sunlit city with too many secrets.', 'Walk the streets, find work, stay ahead of the heat.', 'WASD / arrows to move, Shift to run, mouse to look.'], 'Press Space or click to explore');
      return;
    }

    drawHud(world.state, environment);
    drawCrosshair(screen === SCREEN_PLAY ? aim : null);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The city waits for you.', 'Press Escape or Space to resume.'], 'Take your time');
    else if (screen === SCREEN_OVER) drawPanel('Wasted', ['The street won this round.', `You were caught in ${world.state.area}.`], 'Press Space to start again');
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize, clientToField, view };
}
