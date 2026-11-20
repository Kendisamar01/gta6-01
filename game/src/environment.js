import { DAY_SECONDS, MAP } from './config.js';
import { limit } from './random.js';
import { signalGreen } from './city.js';
import { carSpec } from './vehicles.js';

export function advanceDay(world, dt) {
  world.dayClock = (world.dayClock + dt / DAY_SECONDS) % 1;
}

export function daylight(world) {
  return limit(Math.sin((world.dayClock - 0.18) * Math.PI * 2) * 1.55 + 0.16, 0, 1);
}

export function nightTime(world) {
  return daylight(world) < 0.42;
}

export function paintStreetLamps(ctx, world, view) {
  if (!nightTime(world)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of world.city.lamps) {
    if (lamp.x < view.left || lamp.x > view.right || lamp.y < view.top || lamp.y > view.bottom) continue;
    const inner = lamp.warm ? 'rgba(255,194,108,0.3)' : 'rgba(255,226,170,0.24)';
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 92);
    glow.addColorStop(0, inner);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,231,178,0.8)';
    ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
  }
  ctx.restore();
}

export function paintHeadlightCones(ctx, world, view) {
  if (!nightTime(world)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    if (car.x < view.left - 200 || car.x > view.right + 200
      || car.y < view.top - 200 || car.y > view.bottom + 200) continue;
    const spec = carSpec(car);
    const forward = Math.cos(car.angle);
    const downward = Math.sin(car.angle);
    const noseX = car.x + forward * spec.length / 2;
    const noseY = car.y + downward * spec.length / 2;
    const farX = noseX + forward * 175;
    const farY = noseY + downward * 175;
    const gradient = ctx.createLinearGradient(noseX, noseY, farX, farY);
    gradient.addColorStop(0, 'rgba(255,238,190,0.23)');
    gradient.addColorStop(1, 'rgba(255,238,190,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(noseX - downward * 7, noseY + forward * 7);
    ctx.lineTo(farX - downward * 70, farY + forward * 70);
    ctx.lineTo(farX + downward * 70, farY - forward * 70);
    ctx.lineTo(noseX + downward * 7, noseY - forward * 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function paintNightVeil(ctx, world, view) {
  const darkness = 1 - daylight(world);
  if (darkness <= 0.02) return;
  ctx.save();
  ctx.fillStyle = `rgba(16,32,72,${darkness * 0.46})`;
  ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
  ctx.restore();
}

export function clockLabel(world) {
  const hours = (world.dayClock * 24 + 6) % 24;
  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - wholeHours) * 60);
  return `${String(wholeHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function paintSignalLamps(ctx, signal, world) {
  const green = signalGreen(signal, world.time);
  ctx.fillStyle = '#222d33';
  ctx.fillRect(signal.x - 5, signal.y - 32, 10, 26);
  ctx.fillStyle = green ? '#4fd06b' : '#ef5f56';
  ctx.beginPath();
  ctx.arc(signal.x, signal.y - 25, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = green ? '#245a35' : '#632a2a';
  ctx.beginPath();
  ctx.arc(signal.x, signal.y - 15, 3, 0, Math.PI * 2);
  ctx.fill();
}
