import { DAY_LENGTH, WORLD } from './config.js';
import { clamp } from './random.js';
import { vehicleSpec } from './vehicles.js';

export function updateTime(world, dt) {
  world.timeOfDay = (world.timeOfDay + dt / DAY_LENGTH) % 1;
}

export function daylight(world) {
  const sun = Math.sin((world.timeOfDay - 0.18) * Math.PI * 2);
  return clamp(sun * 1.55 + 0.16, 0, 1);
}

export function isNight(world) {
  return daylight(world) < 0.42;
}

export function drawStreetLights(ctx, world, bounds) {
  if (!isNight(world)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const light of world.city.lights) {
    if (light.x < bounds.left || light.x > bounds.right
      || light.y < bounds.top || light.y > bounds.bottom) continue;
    const color = light.warm ? 'rgba(255,196,110,0.3)' : 'rgba(255,226,170,0.24)';
    const gradient = ctx.createRadialGradient(light.x, light.y, 2, light.x, light.y, 92);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(light.x, light.y, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,231,178,0.8)';
    ctx.fillRect(light.x - 2, light.y - 2, 4, 4);
  }
  ctx.restore();
}

export function drawHeadlights(ctx, world, bounds) {
  if (!isNight(world)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    if (car.x < bounds.left - 200 || car.x > bounds.right + 200
      || car.y < bounds.top - 200 || car.y > bounds.bottom + 200) continue;
    const spec = vehicleSpec(car);
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);
    const frontX = car.x + cos * spec.length / 2;
    const frontY = car.y + sin * spec.length / 2;
    const farX = frontX + cos * 175;
    const farY = frontY + sin * 175;
    const gradient = ctx.createLinearGradient(frontX, frontY, farX, farY);
    gradient.addColorStop(0, 'rgba(255,238,190,0.23)');
    gradient.addColorStop(1, 'rgba(255,238,190,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(frontX - sin * 7, frontY + cos * 7);
    ctx.lineTo(farX - sin * 70, farY + cos * 70);
    ctx.lineTo(farX + sin * 70, farY - cos * 70);
    ctx.lineTo(frontX + sin * 7, frontY - cos * 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawNightOverlay(ctx, world, bounds) {
  const night = 1 - daylight(world);
  if (night <= 0.02) return;
  ctx.save();
  ctx.fillStyle = `rgba(16,32,72,${night * 0.46})`;
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  ctx.restore();
}

export function timeLabel(world) {
  const hour = Math.floor((world.timeOfDay * 24 + 6) % 24);
  const minute = Math.floor((world.timeOfDay * 24 * 60) % 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function sunPosition(world) {
  const angle = (world.timeOfDay - 0.25) * Math.PI * 2;
  return { x: WORLD.width / 2 + Math.cos(angle) * 900, y: 1100 - Math.sin(angle) * 800 };
}
