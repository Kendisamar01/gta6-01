import { COLORS } from './config.js';
import { range } from './random.js';

const PARTICLE_LIMIT = 520;
const SKID_LIMIT = 260;

export function createEffects() {
  return { particles: [], skids: [], flashes: [], lights: [] };
}

export function emit(world, kind, x, y, count = 1, options = {}) {
  const random = world.random;
  const spread = options.spread ?? 40;
  const color = options.color ?? '#ffffff';
  const size = options.size ?? 4;
  const life = options.life ?? 0.6;
  for (let i = 0; i < count; i += 1) {
    const angle = options.angle === undefined
      ? random() * Math.PI * 2
      : options.angle + range(random, -spread, spread);
    const velocity = range(random, spread * 0.4, spread * 2.2);
    if (world.effects.particles.length >= PARTICLE_LIMIT) world.effects.particles.shift();
    world.effects.particles.push({
      kind,
      x,
      y,
      vx: Math.cos(angle) * velocity + (options.vx ?? 0),
      vy: Math.sin(angle) * velocity + (options.vy ?? 0),
      life: life * range(random, 0.7, 1.3),
      maxLife: life * 1.3,
      size: size * range(random, 0.65, 1.4),
      color,
      angle: options.angle ?? 0,
      rises: kind === 'smoke' || kind === 'dust',
    });
  }
}

export function addSkid(world, x, y, angle, strength = 1) {
  if (world.effects.skids.length >= SKID_LIMIT) world.effects.skids.shift();
  world.effects.skids.push({ x, y, angle, life: 7, strength });
}

export function addFlash(world, color, alpha, life = 0.18) {
  world.effects.flashes.push({ color, alpha, life, maxLife: life });
}

export function addLight(world, x, y, color, radius, life = 0.12) {
  world.effects.lights.push({ x, y, color, radius, life, maxLife: life });
}

export function updateEffects(world, dt) {
  const particles = world.effects.particles;
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    if (particle.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    if (particle.rises) {
      particle.vy -= 16 * dt;
      particle.size += 8 * dt;
    } else {
      particle.vx *= 1 - dt * 2.4;
      particle.vy *= 1 - dt * 2.4;
    }
  }

  for (const skid of world.effects.skids) {
    skid.life -= dt;
  }
  for (let i = world.effects.skids.length - 1; i >= 0; i -= 1) {
    if (world.effects.skids[i].life <= 0) world.effects.skids.splice(i, 1);
  }

  for (const name of ['flashes', 'lights']) {
    const items = world.effects[name];
    for (let i = items.length - 1; i >= 0; i -= 1) {
      items[i].life -= dt;
      if (items[i].life <= 0) items.splice(i, 1);
    }
  }
}

export function drawSkids(ctx, world, bounds) {
  ctx.save();
  ctx.lineWidth = 2.4;
  for (const skid of world.effects.skids) {
    if (skid.x < bounds.left || skid.x > bounds.right || skid.y < bounds.top || skid.y > bounds.bottom) continue;
    ctx.strokeStyle = `rgba(30,28,30,${Math.min(0.4, skid.life / 18) * skid.strength})`;
    ctx.beginPath();
    ctx.moveTo(skid.x, skid.y);
    ctx.lineTo(skid.x - Math.cos(skid.angle) * 7, skid.y - Math.sin(skid.angle) * 7);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParticles(ctx, world) {
  ctx.save();
  for (const particle of world.effects.particles) {
    const remaining = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = Math.min(1, remaining * 1.4);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    if (particle.kind === 'muzzle') {
      ctx.moveTo(
        particle.x + Math.cos(particle.angle) * particle.size * 2.4,
        particle.y + Math.sin(particle.angle) * particle.size * 2.4,
      );
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    } else {
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

export function drawLights(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const light of world.effects.lights) {
    const remaining = light.life / light.maxLife;
    const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
    glow.addColorStop(0, light.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = remaining * 0.55;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFlashes(ctx, world) {
  for (const flash of world.effects.flashes) {
    const remaining = flash.life / flash.maxLife;
    ctx.save();
    ctx.globalAlpha = flash.alpha * remaining;
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}

export const EFFECT_COLORS = Object.freeze({
  smoke: '#6c6c6c',
  spark: COLORS.gold,
  fire: '#ff7a3d',
  dust: '#d7c49a',
  blood: '#b34b4b',
  glass: '#b8e7ef',
});
