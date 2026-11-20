import { kickCamera } from './camera.js';

export function burst(world, x, y, count, color, speed, size, life) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random() * Math.PI * 2;
    const velocity = speed * (0.35 + world.random() * 0.8);
    const duration = life * (0.6 + world.random() * 0.7);
    world.effects.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: duration,
      max: duration,
      color,
      size: size * (0.6 + world.random() * 0.8),
      opacity: 1,
      kind: 'dot',
    });
  }
}

export function update(world, dt, api) {
  for (let index = world.effects.length - 1; index >= 0; index -= 1) {
    const effect = world.effects[index];
    effect.life -= dt;
    effect.x += effect.vx * dt;
    effect.y += effect.vy * dt;
    effect.vx *= 1 - Math.min(1, dt * 1.8);
    effect.vy *= 1 - Math.min(1, dt * 1.8);
    if (effect.life <= 0) world.effects.splice(index, 1);
  }
  for (let index = world.skids.length - 1; index >= 0; index -= 1) {
    const skid = world.skids[index];
    skid.life -= dt;
    if (skid.life <= 0) world.skids.splice(index, 1);
  }
  for (const car of world.vehicles) {
    if (car.dead || car.damage < 62 || world.random() > dt * (6 + (car.damage - 62) * 0.5)) continue;
    world.effects.push({
      x: car.x - Math.cos(car.angle) * 20,
      y: car.y - Math.sin(car.angle) * 20,
      vx: (world.random() - 0.5) * 16,
      vy: -18 - world.random() * 18,
      life: 1.4,
      max: 1.4,
      color: car.damage > 85 ? 'rgba(70,62,58,0.75)' : 'rgba(140,140,145,0.55)',
      size: 8,
      opacity: 0.7,
      kind: 'dot',
    });
  }
}

export function event(event, world, api) {
  if (event.type === 'shot') {
    burst(world, event.x, event.y, 3, '#ffe6a2', 70, 4, 0.16);
    if (event.owner === 'player') api.kick(0.045);
  } else if (event.type === 'punch') {
    burst(world, event.x, event.y, 3, 'rgba(255,235,200,0.8)', 50, 4, 0.2);
  } else if (event.type === 'impact') {
    const color = event.cause === 'metal' ? '#ffd98a' : event.cause === 'car' ? '#ffbc7d' : 'rgba(196,74,70,0.85)';
    burst(world, event.x, event.y, event.cause === 'wall' ? 5 : 8, color, 95, 4, 0.4);
  } else if (event.type === 'crash') {
    burst(world, event.x, event.y, 7, '#ffd77a', 130, 4, 0.32);
    if (event.strength > 90) burst(world, event.x, event.y, 5, 'rgba(90,90,95,0.6)', 40, 12, 1);
  } else if (event.type === 'explosion') {
    burst(world, event.x, event.y, 34, '#ffb347', 260, 11, 0.85);
    burst(world, event.x, event.y, 18, 'rgba(70,70,76,0.8)', 90, 18, 1.8);
    world.effects.push({ x: event.x, y: event.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#fff0b8', size: 74, kind: 'ring' });
    kickCamera(api.camera, 0.85);
  } else if (event.type === 'missionComplete') {
    world.effects.push({ x: world.player.x, y: world.player.y, vx: 0, vy: 0, life: 0.8, max: 0.8, color: '#8de08b', size: 96, kind: 'ring' });
  }
}

export function drawWorld(ctx, world) {
  ctx.globalCompositeOperation = 'lighter';
  for (const car of world.vehicles) {
    if (car.role !== 'police' || !car.siren) continue;
    const phase = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = phase ? 'rgba(80,130,255,0.16)' : 'rgba(255,70,70,0.16)';
    ctx.beginPath();
    ctx.arc(car.x, car.y, 82, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
