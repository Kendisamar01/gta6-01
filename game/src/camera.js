import { MAP, SCREEN } from './config.js';
import { blend, limit } from './random.js';

export function makeCamera(x = SCREEN.width / 2, y = SCREEN.height / 2) {
  return { x, y, zoom: 1, tremor: 0, offsetX: 0, offsetY: 0 };
}

export function followCamera(camera, focus, dt, leadX = 0, leadY = 0) {
  const ease = 1 - Math.exp(-5.5 * dt);
  camera.x = blend(camera.x, focus.x + leadX, ease);
  camera.y = blend(camera.y, focus.y + leadY, ease);
  const halfWidth = SCREEN.width / (2 * camera.zoom);
  const halfHeight = SCREEN.height / (2 * camera.zoom);
  camera.x = limit(camera.x, halfWidth, MAP.width - halfWidth);
  camera.y = limit(camera.y, halfHeight, MAP.height - halfHeight);
  camera.tremor = Math.max(0, camera.tremor - 26 * dt);
  const rhythm = focus.tickHint ?? 0;
  camera.offsetX = Math.sin(rhythm * 1.83) * camera.tremor;
  camera.offsetY = Math.cos(rhythm * 2.41) * camera.tremor;
}

export function kickCamera(camera, strength) {
  camera.tremor = Math.min(24, camera.tremor + strength);
}

export function screenPoint(camera, x, y) {
  return {
    x: camera.x + (x - SCREEN.width / 2) / camera.zoom,
    y: camera.y + (y - SCREEN.height / 2) / camera.zoom,
  };
}

export function worldPoint(camera, x, y) {
  return {
    x: SCREEN.width / 2 + (x - camera.x) * camera.zoom,
    y: SCREEN.height / 2 + (y - camera.y) * camera.zoom,
  };
}

export function visibleRect(camera, padding = 80) {
  const halfWidth = SCREEN.width / (2 * camera.zoom) + padding;
  const halfHeight = SCREEN.height / (2 * camera.zoom) + padding;
  return {
    left: camera.x - halfWidth,
    right: camera.x + halfWidth,
    top: camera.y - halfHeight,
    bottom: camera.y + halfHeight,
  };
}
