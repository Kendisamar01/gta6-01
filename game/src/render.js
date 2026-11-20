import { FONT, PALETTE, SCREEN } from './config.js';
import { visibleRect } from './camera.js';
import { paintBits, paintFlares, paintTints, paintTreads } from './effects.js';
import {
  paintHeadlightCones, paintNightVeil, paintStreetLamps,
} from './environment.js';
import {
  paintBlocks, paintFurniture, paintGround, paintMarkers, paintStreets, paintSunwash,
} from './city-render.js';
import { paintEntities } from './entity-render.js';
import { sideHint } from './activities.js';
import { drawHUD } from './hud.js';
import { drawMinimap } from './minimap.js';
import { drawControls, drawEnd, drawPause, drawTitle } from './menu.js';

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
    frame.scale = Math.min(width / SCREEN.width, height / SCREEN.height);
    frame.x = (width - SCREEN.width * frame.scale) / 2;
    frame.y = (height - SCREEN.height * frame.scale) / 2;
  }

  function paintWorld(world) {
    const view = visibleRect(world.camera, 120);
    ctx.save();
    ctx.translate(
      SCREEN.width / 2 + world.camera.offsetX,
      SCREEN.height / 2 + world.camera.offsetY,
    );
    ctx.scale(world.camera.zoom, world.camera.zoom);
    ctx.translate(-world.camera.x, -world.camera.y);
    paintGround(ctx, view);
    paintStreets(ctx, view);
    paintTreads(ctx, world, view);
    paintBlocks(ctx, world, view);
    paintSunwash(ctx, world, view);
    paintNightVeil(ctx, world, view);
    paintStreetLamps(ctx, world, view);
    paintHeadlightCones(ctx, world, view);
    paintFurniture(ctx, world, view);
    paintMarkers(ctx, world, view);
    paintEntities(ctx, world, view);
    paintBits(ctx, world);
    paintFlares(ctx, world);
    ctx.restore();
  }

  function paintHint(world) {
    if (world.dialogue || world.mission.active || world.activity.active) return;
    const hint = sideHint(world);
    if (hint === '') return;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    const width = ctx.measureText(hint).width + 28;
    ctx.fillStyle = 'rgba(12,24,31,0.82)';
    ctx.beginPath();
    ctx.roundRect((SCREEN.width - width) / 2, 578, width, 26, 7);
    ctx.fill();
    ctx.fillStyle = '#8fe0d6';
    ctx.fillText(hint, SCREEN.width / 2, 596);
  }

  function draw(world, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(frame.scale, 0, 0, frame.scale, frame.x, frame.y);
    ctx.textBaseline = 'alphabetic';

    if (screen === SCREEN_TITLE) {
      drawTitle(ctx, world);
      paintTints(ctx, world);
      return;
    }
    if (screen === SCREEN_CONTROLS) {
      drawControls(ctx);
      return;
    }

    paintWorld(world);
    paintTints(ctx, world);
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
