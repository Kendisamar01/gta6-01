import { FONT, PALETTE, VIEW } from './config.js';
import { drawCity } from './city-render.js';
import { drawEntities } from './entity-render.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TITLE_OPTIONS = ['New Game', 'Continue', 'Controls'];
const PAUSE_OPTIONS = ['Resume', 'Controls', 'Save Game', 'Load Game', 'Quit to Title'];

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  const overlays = [];
  const worldLayers = [];

  function text(value, x, y, size, color, align = 'left', weight = '') {
    context.font = `${weight} ${size}px ${FONT}`.trim();
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function bar(x, y, width, height, value, maximum, color) {
    context.fillStyle = 'rgba(10,20,28,0.78)';
    context.fillRect(x, y, width, height);
    context.fillStyle = color;
    context.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * Math.min(1, value / maximum)), height - 4);
  }

  function basicHud(world) {
    const state = world.state;
    bar(24, 22, 176, 14, state.health, 100, PALETTE.danger);
    bar(24, 42, 176, 12, state.armor, 100, '#7cc3e8');
    text(`$${state.money}`, VIEW.width - 24, 42, 24, PALETTE.accent, 'right', 'bold');
    text(world.city.districtAt(state.player.x, state.player.y), VIEW.width / 2, 40, 20, PALETTE.text, 'center');
    context.fillStyle = 'rgba(10,20,28,0.62)';
    context.fillRect(20, VIEW.height - 46, 430, 28);
    text('WASD walk  Shift run  E car  Mouse aim/fire  Esc menu', 32, VIEW.height - 27, 14, PALETTE.muted);
  }

  function panel(title, options, selection, note) {
    context.fillStyle = 'rgba(8,18,30,0.72)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    const width = 520;
    const height = 150 + options.length * 54 + (note ? 42 : 0);
    const left = (VIEW.width - width) / 2;
    const top = (VIEW.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(left, top, width, height);
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 2;
    context.strokeRect(left, top, width, height);
    text(title, VIEW.width / 2, top + 76, 52, PALETTE.accent, 'center', 'bold');
    if (note) text(note, VIEW.width / 2, top + 110, 16, PALETTE.muted, 'center');
    for (let index = 0; index < options.length; index += 1) {
      const y = top + 142 + index * 54 + (note ? 34 : 0);
      if (index === selection) {
        context.fillStyle = 'rgba(242,181,68,0.2)';
        context.fillRect(left + 38, y - 27, width - 76, 40);
        context.fillStyle = PALETTE.accent;
        context.fillRect(left + 38, y - 27, 4, 40);
      }
      text(options[index], left + 62, y, 22, index === selection ? PALETTE.text : PALETTE.muted);
    }
  }

  function titleArt(clock) {
    const gradient = context.createLinearGradient(0, 0, 0, VIEW.height);
    gradient.addColorStop(0, '#183a5b');
    gradient.addColorStop(0.5, '#d98a67');
    gradient.addColorStop(1, '#f4c789');
    context.fillStyle = gradient;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    context.fillStyle = 'rgba(255,236,180,0.75)';
    context.beginPath();
    context.arc(940, 268, 116, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(23,48,62,0.55)';
    for (let index = 0; index < 7; index += 1) {
      const x = index * 210 - 60;
      const height = 150 + (index % 3) * 70;
      context.fillRect(x, VIEW.height - height - 90, 150, height);
    }
    context.fillStyle = 'rgba(12,34,46,0.8)';
    context.fillRect(0, VIEW.height - 90, VIEW.width, 90);
    context.strokeStyle = 'rgba(240,215,160,0.25)';
    context.lineWidth = 4;
    for (let index = 0; index < 3; index += 1) {
      const y = VIEW.height - 66 + index * 22 + Math.sin(clock * 2 + index) * 4;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(VIEW.width, y);
      context.stroke();
    }
  }

  function drawTitle(world, ui) {
    titleArt(world.clock);
    context.fillStyle = 'rgba(10,24,38,0.62)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    text('SOLARA BAY', VIEW.width / 2, 258, 84, '#ffe0a0', 'center', 'bold');
    text('An original sun-soaked crime city', VIEW.width / 2, 296, 20, '#d4e3e8', 'center');
    panel('', TITLE_OPTIONS, ui.selection, 'Arrow keys to choose  ·  Enter to select');
    text('v1.0  ·  No downloads, no network, all drawn live', VIEW.width / 2, VIEW.height - 18, 13, 'rgba(240,240,220,0.65)', 'center');
  }

  function drawDeathScreen(world) {
    context.fillStyle = 'rgba(12,18,26,0.74)';
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    text(world.state.busted ? 'BUSTED' : 'WASTED', VIEW.width / 2, VIEW.height / 2 - 10, 76, PALETTE.danger, 'center', 'bold');
    text('Press Enter to respawn', VIEW.width / 2, VIEW.height / 2 + 44, 22, PALETTE.text, 'center');
  }

  function draw(world, camera, environment, screen, ui) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = environment.sky();
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    context.save();
    camera.apply(context);
    drawCity(context, world.city, camera, environment);
    for (const layer of worldLayers) layer(context, world, camera, environment);
    drawEntities(context, world, environment);
    context.restore();

    if (screen === SCREEN_TITLE) {
      drawTitle(world, ui);
      if (world.systems.menu) world.systems.menu.draw(context, world, ui, screen);
      return;
    }
    if (!world.systems.hud) basicHud(world);
    for (const overlay of overlays) overlay(context, world, ui, screen);

    if (screen === SCREEN_PAUSED && !world.systems.menu) {
      panel('Paused', PAUSE_OPTIONS, ui.selection, 'Esc resumes the city');
    } else if (screen === SCREEN_OVER) {
      drawDeathScreen(world);
    }
    if (world.systems.menu && (screen === SCREEN_PAUSED || screen === SCREEN_OVER)) {
      world.systems.menu.draw(context, world, ui, screen);
    }
  }

  return { draw, context, overlays, worldLayers, panel, text, bar, TITLE_OPTIONS, PAUSE_OPTIONS };
}
