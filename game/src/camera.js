import { VIEW, WORLD } from './config.js';

export function createCamera() {
  let x = VIEW.width / 2;
  let y = VIEW.height / 2;
  let shake = 0;
  let clock = 0;
  let offsetX = 0;
  let offsetY = 0;

  function clamp() {
    x = Math.max(VIEW.width / 2, Math.min(WORLD.width - VIEW.width / 2, x));
    y = Math.max(VIEW.height / 2, Math.min(WORLD.height - VIEW.height / 2, y));
  }

  function follow(target, leadX, leadY, dt, instant = false) {
    const wantedX = target.x + leadX * 0.22;
    const wantedY = target.y + leadY * 0.22;
    if (instant) {
      x = wantedX;
      y = wantedY;
    } else {
      const blend = 1 - Math.exp(-dt * 5.5);
      x += (wantedX - x) * blend;
      y += (wantedY - y) * blend;
    }
    clamp();
  }

  function update(dt) {
    clock += dt;
    shake = Math.max(0, shake - dt * 28);
    offsetX = Math.sin(clock * 71) * shake;
    offsetY = Math.cos(clock * 57) * shake;
  }

  function apply(context) {
    context.translate(VIEW.width / 2 - x + offsetX, VIEW.height / 2 - y + offsetY);
  }

  function toWorld(screenX, screenY) {
    return { x: screenX + x - VIEW.width / 2 - offsetX, y: screenY + y - VIEW.height / 2 - offsetY };
  }

  function toScreen(worldX, worldY) {
    return { x: worldX - x + VIEW.width / 2 + offsetX, y: worldY - y + VIEW.height / 2 + offsetY };
  }

  function kick(amount) {
    shake = Math.min(26, shake + amount);
  }

  function center(worldX, worldY) {
    x = worldX;
    y = worldY;
    clamp();
  }

  return {
    follow, update, apply, toWorld, toScreen, kick, center,
    get x() { return x; },
    get y() { return y; },
  };
}
