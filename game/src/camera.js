// The viewport into the city. It eases toward the player, leans slightly in the direction of
// travel, refuses to show the void past the map edge, and offers both coordinate conversions so
// input and drawing use the same numbers. Shake is driven by a counter, not Math.random, so shots
// stay repeatable.
import { VIEW } from './config.js';

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createCamera() {
  const camera = {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    bounds: 4096,
    shake: 0,
    offsetX: 0,
    offsetY: 0,
    phase: 0,
  };

  function setBounds(size) {
    camera.bounds = size;
  }

  function snap(x, y) {
    camera.x = clamp(x, VIEW.width / 2, Math.max(VIEW.width / 2, camera.bounds - VIEW.width / 2));
    camera.y = clamp(y, VIEW.height / 2, Math.max(VIEW.height / 2, camera.bounds - VIEW.height / 2));
  }

  function follow(player, dt) {
    const leadX = clamp(player.vx * 0.34, -210, 210);
    const leadY = clamp(player.vy * 0.34, -150, 150);
    const blend = 1 - Math.exp(-dt * 5.5);
    camera.x += (player.x + leadX - camera.x) * blend;
    camera.y += (player.y + leadY - camera.y) * blend;
    snap(camera.x, camera.y);
  }

  function kick(amount) {
    camera.shake = Math.max(camera.shake, amount);
  }

  function update(dt) {
    camera.phase += dt * 43;
    camera.shake = Math.max(0, camera.shake - dt * 26);
    camera.offsetX = Math.sin(camera.phase * 1.7) * camera.shake;
    camera.offsetY = Math.cos(camera.phase * 2.3) * camera.shake * 0.7;
  }

  function begin(context) {
    context.save();
    context.translate(VIEW.width / 2 - camera.x + camera.offsetX, VIEW.height / 2 - camera.y + camera.offsetY);
  }

  function end(context) {
    context.restore();
  }

  function toWorld(screenX, screenY) {
    return { x: screenX + camera.x - VIEW.width / 2 - camera.offsetX, y: screenY + camera.y - VIEW.height / 2 - camera.offsetY };
  }

  function toScreen(x, y) {
    return { x: x - camera.x + VIEW.width / 2 + camera.offsetX, y: y - camera.y + VIEW.height / 2 + camera.offsetY };
  }

  return { camera, setBounds, snap, follow, kick, update, begin, end, toWorld, toScreen };
}
