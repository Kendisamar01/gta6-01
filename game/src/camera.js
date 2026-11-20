import { FIELD } from './config.js';

export function createSolaraCamera(bounds) {
  return {
    x: bounds.width / 2,
    y: bounds.height / 2,
    zoom: 1,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    tick: 0,
    bounds,
    ready: false,
  };
}

export function updateCamera(camera, target, dt, lead = 0.3) {
  camera.tick += dt;
  const wantedX = target.x + (target.vx || 0) * lead;
  const wantedY = target.y + (target.vy || 0) * lead;
  if (!camera.ready) {
    camera.x = wantedX;
    camera.y = wantedY;
    camera.ready = true;
  } else {
    const blend = 1 - Math.exp(-dt * 5.5);
    camera.x += (wantedX - camera.x) * blend;
    camera.y += (wantedY - camera.y) * blend;
  }
  const halfW = FIELD.width / (2 * camera.zoom);
  const halfH = FIELD.height / (2 * camera.zoom);
  camera.x = camera.bounds.width <= halfW * 2 ? camera.bounds.width / 2 : Math.max(halfW, Math.min(camera.bounds.width - halfW, camera.x));
  camera.y = camera.bounds.height <= halfH * 2 ? camera.bounds.height / 2 : Math.max(halfH, Math.min(camera.bounds.height - halfH, camera.y));
  if (camera.shake > 0) {
    camera.shake = Math.max(0, camera.shake - dt * 2.4);
    const amount = camera.shake * 13;
    camera.shakeX = (Math.sin(camera.tick * 4.9) + Math.sin(camera.tick * 2.2)) * amount;
    camera.shakeY = (Math.cos(camera.tick * 4.1) + Math.sin(camera.tick * 1.7)) * amount;
  } else {
    camera.shakeX = 0;
    camera.shakeY = 0;
  }
}

export function kickCamera(camera, amount) {
  camera.shake = Math.min(1.6, camera.shake + amount);
}

export function cameraOffset(camera) {
  return {
    x: FIELD.width / (2 * camera.zoom) - camera.x + camera.shakeX,
    y: FIELD.height / (2 * camera.zoom) - camera.y + camera.shakeY,
  };
}

export function worldToScreen(camera, x, y) {
  const offset = cameraOffset(camera);
  return { x: (x + offset.x) * camera.zoom, y: (y + offset.y) * camera.zoom };
}

export function screenToWorld(camera, x, y) {
  const offset = cameraOffset(camera);
  return { x: x / camera.zoom - offset.x, y: y / camera.zoom - offset.y };
}

export function visibleRect(camera, margin = 80) {
  return {
    x: camera.x - FIELD.width / (2 * camera.zoom) - margin,
    y: camera.y - FIELD.height / (2 * camera.zoom) - margin,
    w: FIELD.width / camera.zoom + margin * 2,
    h: FIELD.height / camera.zoom + margin * 2,
  };
}
