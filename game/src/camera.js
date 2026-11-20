import { FIELD, CAMERA, WORLD, WALKER } from './config.js';

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function createCamera() {
  const state = {
    x: WALKER.startX,
    y: WALKER.startY,
    shake: 0,
    time: 0,
  };

  function bounds() {
    return {
      minX: FIELD.width / 2 - 120,
      maxX: WORLD.width - FIELD.width / 2 + 120,
      minY: FIELD.height / 2 - 120,
      maxY: WORLD.shoreY + 140,
    };
  }

  function snap(target) {
    const edge = bounds();
    state.x = clamp(target.x, edge.minX, edge.maxX);
    state.y = clamp(target.y, edge.minY, edge.maxY);
    state.shake = 0;
    state.time = 0;
  }

  function follow(target, dt, aim) {
    state.time += dt;
    const leadX = clamp(target.vx * CAMERA.look + (aim ? (aim.x - target.x) * CAMERA.aim : 0), -190, 190);
    const leadY = clamp(target.vy * CAMERA.look + (aim ? (aim.y - target.y) * CAMERA.aim : 0), -150, 150);
    const edge = bounds();
    const wantedX = clamp(target.x + leadX, edge.minX, edge.maxX);
    const wantedY = clamp(target.y + leadY, edge.minY, edge.maxY);
    const blend = 1 - Math.exp(-CAMERA.ease * dt);
    state.x += (wantedX - state.x) * blend;
    state.y += (wantedY - state.y) * blend;
    state.shake = Math.max(0, state.shake - dt * CAMERA.shakeDecay);
  }

  function offset() {
    return {
      x: Math.sin(state.time * 47) * state.shake,
      y: Math.cos(state.time * 61) * state.shake * 0.7,
    };
  }

  function toWorld(screenX, screenY) {
    return {
      x: state.x + screenX - FIELD.width / 2,
      y: state.y + screenY - FIELD.height / 2,
    };
  }

  function toScreen(worldX, worldY) {
    return {
      x: worldX - state.x + FIELD.width / 2,
      y: worldY - state.y + FIELD.height / 2,
    };
  }

  function kick(amount) {
    state.shake = Math.max(state.shake, amount);
  }

  return { state, snap, follow, offset, toWorld, toScreen, kick };
}
