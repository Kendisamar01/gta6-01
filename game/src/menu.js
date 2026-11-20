import { FIELD, SCREENS, SOLARA } from './config.js';
import { formatClock } from './world.js';
import { solaraPanel, solaraText } from './render.js';

const OPTIONS = ['RESUME', 'CONTROLS', 'SAVE GAME', 'LOAD GAME', 'TOGGLE AUDIO', 'QUIT TO TITLE'];

export function step(world, dt) {
  world.menuPulse = (world.menuPulse || 0) + dt;
}

export function key(code, world, api) {
  if (world.controlsOpen) {
    if (code === 'Escape' || code === 'Enter') world.controlsOpen = false;
    world.menuConsumed = true;
    return;
  }
  if (world.screen === SCREENS.play && (code === 'Escape' || code === 'KeyP')) {
    world.screen = SCREENS.menu;
    world.pauseIndex = 0;
    world.menuConsumed = true;
    return;
  }
  if (world.screen !== SCREENS.menu && world.screen !== SCREENS.paused) return;
  world.menuConsumed = true;
  if (code === 'KeyW' || code === 'ArrowUp') world.pauseIndex = (world.pauseIndex - 1 + OPTIONS.length) % OPTIONS.length;
  else if (code === 'KeyS' || code === 'ArrowDown') world.pauseIndex = (world.pauseIndex + 1) % OPTIONS.length;
  else if (code === 'Escape' || code === 'KeyP') world.screen = SCREENS.play;
  else if (code === 'Enter' || code === 'Space') {
    const choice = OPTIONS[world.pauseIndex];
    if (choice === 'RESUME') world.screen = SCREENS.play;
    else if (choice === 'CONTROLS') world.controlsOpen = true;
    else if (choice === 'SAVE GAME') {
      const ok = api.systems.save?.save?.(world);
      world.menuStatus = ok ? 'Game saved.' : 'Could not save game.';
    } else if (choice === 'LOAD GAME') {
      const ok = api.systems.save?.load?.(world);
      world.menuStatus = ok ? 'Game loaded.' : 'No saved game found.';
      if (ok) world.screen = SCREENS.play;
    } else if (choice === 'TOGGLE AUDIO') {
      world.muted = !world.muted;
      api.systems.audio?.mute?.(world.muted);
      world.menuStatus = world.muted ? 'Audio muted.' : 'Audio on.';
    } else if (choice === 'QUIT TO TITLE') {
      world.screen = SCREENS.title;
      world.menuIndex = 0;
    }
    api.announce(world.menuStatus || `${choice} selected.`);
  }
}

export function draw(ctx, world, api) {
  if (world.screen !== SCREENS.menu && world.screen !== SCREENS.paused) return;
  ctx.fillStyle = 'rgba(5,13,20,0.7)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  solaraPanel(ctx, 372, 106, 536, 522, 'rgba(10,24,34,0.94)');
  solaraText(ctx, 'Solara Bay', FIELD.width / 2, 162, 42, SOLARA.accent, 'center', 'middle', '800');
  solaraText(ctx, formatClock(world), FIELD.width / 2, 200, 14, SOLARA.muted, 'center', 'middle');
  for (let i = 0; i < OPTIONS.length; i += 1) {
    const active = i === world.pauseIndex;
    const y = 240 + i * 54;
    if (active) {
      ctx.fillStyle = 'rgba(255,209,102,0.14)';
      ctx.fillRect(404, y - 20, 472, 40);
      ctx.fillStyle = SOLARA.accent;
      ctx.fillRect(404, y - 20, 4, 40);
    }
    solaraText(ctx, OPTIONS[i], 428, y, active ? 21 : 18, active ? SOLARA.accent : SOLARA.text, 'left', 'middle', active ? '700' : '');
  }
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(404, 572, 472, 1);
  solaraText(ctx, world.menuStatus || `$${world.player.money}   RESPECT ${world.player.respect}`, FIELD.width / 2, 596, 14, SOLARA.muted, 'center', 'middle');
  solaraText(ctx, 'W/S choose   ENTER select   ESC resume', FIELD.width / 2, 690, 13, SOLARA.muted, 'center', 'middle');
}
