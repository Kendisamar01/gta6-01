import { COLORS, FONT, VIEW } from './config.js';
import { visibleBounds } from './camera.js';
import { drawHUD } from './hud.js';
import { drawMinimap } from './minimap.js';
import { drawControls, drawEnd, drawPause, drawTitle } from './menu.js';
import { drawFlashes, drawLights, drawParticles, drawSkids } from './effects.js';
import { drawHeadlights, drawNightOverlay, drawStreetLights } from './environment.js';
import { drawBlocks, drawGround, drawMarkers, drawProps, drawRoads, sunWash } from './city-render.js';
import { drawEntities } from './entity-render.js';
import { sideJobHint } from './activities.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CONTROLS = 'controls';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const frame = { scale: 1, x: 0, y: 0 };

  function resize() {
    const density = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(window.innerWidth * density));
    const height = Math.max(1, Math.round(window.innerHeight * density));
    canvas.width = width;
    canvas.height = height;
    frame.scale = Math.min(width / VIEW.width, height / VIEW.height);
    frame.x = (width - VIEW.width * frame.scale) / 2;
    frame.y = (height - VIEW.height * frame.scale) / 2;
  }

  function paintWorld(world) {
    const bounds = visibleBounds(world.camera, 130);
    ctx.save();
    ctx.translate(VIEW.width / 2 + world.camera.shakeX, VIEW.height / 2 + world.camera.shakeY);
    ctx.scale(world.camera.zoom, world.camera.zoom);
    ctx.translate(-world.camera.x, -world.camera.y);
    drawGround(ctx, bounds);
    drawRoads(ctx, bounds);
    drawSkids(ctx, world, bounds);
    drawBlocks(ctx, world, bounds);
    sunWash(ctx, world, bounds);
    drawNightOverlay(ctx, world, bounds);
    drawStreetLights(ctx, world, bounds);
    drawHeadlights(ctx, world, bounds);
    drawProps(ctx, world, bounds);
    drawLights(ctx, world);
    drawMarkers(ctx, world, bounds);
    drawEntities(ctx, world, bounds);
    drawParticles(ctx, world);
    ctx.restore();
  }

  function paintHint(world) {
    if (world.dialogue || world.mission.active || world.activity.active) return;
    const hint = sideJobHint(world);
    if (hint === '') return;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    const width = ctx.measureText(hint).width + 28;
    ctx.fillStyle = 'rgba(12,24,31,0.8)';
    ctx.beginPath();
    ctx.roundRect((VIEW.width - width) / 2, 578, width, 26, 7);
    ctx.fill();
    ctx.fillStyle = '#8fe0d6';
    ctx.fillText(hint, VIEW.width / 2, 596);
  }

  function draw(world, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(frame.scale, 0, 0, frame.scale, frame.x, frame.y);
    ctx.textBaseline = 'alphabetic';

    if (screen === SCREEN_TITLE) {
      drawTitle(ctx, world);
      return;
    }
    if (screen === SCREEN_CONTROLS) {
      drawControls(ctx);
      return;
    }

    paintWorld(world);
    drawFlashes(ctx, world);

    if (screen === SCREEN_PLAY) {
      drawHUD(ctx, world);
      drawMinimap(ctx, world);
      paintHint(world);
    } else if (screen === SCREEN_PAUSED) {
      drawHUD(ctx, world);
      drawMinimap(ctx, world);
      drawPause(ctx, world);
    } else if (screen === SCREEN_OVER) {
      drawHUD(ctx, world);
      drawEnd(ctx, world, world.endKind ?? 'wasted');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize };
}
