import { VIEW, WORLD } from './config.js';
import { clamp, lerp } from './random.js';

export function createCamera(x, y) {
  return {
    x: x ?? VIEW.width / 2,
    y: y ?? VIEW.height / 2,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    zoom: 1,
  };
}

export function updateCamera(camera, target, dt, leadX = 0, leadY = 0) {
  const follow = 1 - Math.exp(-5.5 * dt);
  camera.x = lerp(camera.x, target.x + leadX, follow);
  camera.y = lerp(camera.y, target.y + leadY, follow);
  const halfWidth = VIEW.width / (2 * camera.zoom);
  const halfHeight = VIEW.height / (2 * camera.zoom);
  camera.x = clamp(camera.x, halfWidth, WORLD.width - halfWidth);
  camera.y = clamp(camera.y, halfHeight, WORLD.height - halfHeight);
  camera.shake = Math.max(0, camera.shake - 26 * dt);
  const phase = target.stepHint ?? 0;
  camera.shakeX = Math.sin(phase * 1.83) * camera.shake;
  camera.shakeY = Math.cos(phase * 2.41) * camera.shake;
}

export function addShake(camera, amount) {
  camera.shake = Math.min(24, camera.shake + amount);
}

export function screenToWorld(camera, screenX, screenY) {
  return {
    x: camera.x + (screenX - VIEW.width / 2) / camera.zoom,
    y: camera.y + (screenY - VIEW.height / 2) / camera.zoom,
  };
}

export function worldToScreen(camera, worldX, worldY) {
  return {
    x: VIEW.width / 2 + (worldX - camera.x) * camera.zoom,
    y: VIEW.height / 2 + (worldY - camera.y) * camera.zoom,
  };
}

export function visibleBounds(camera, padding = 80) {
  const halfWidth = VIEW.width / (2 * camera.zoom) + padding;
  const halfHeight = VIEW.height / (2 * camera.zoom) + padding;
  return {
    left: camera.x - halfWidth,
    right: camera.x + halfWidth,
    top: camera.y - halfHeight,
    bottom: camera.y + halfHeight,
  };
}
