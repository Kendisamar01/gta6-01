import { PALETTE } from './config.js';
import { between } from './random.js';

const MAX_BITS = 520;
const MAX_TREADS = 260;

export function makeEffects() {
  return { bits: [], treads: [], tints: [], flares: [] };
}

export function spray(world, kind, x, y, count = 1, options = {}) {
  const rng = world.rng;
  const scatter = options.scatter ?? 40;
  const tint = options.color ?? PALETTE.cream;
  const size = options.size ?? 4;
  const life = options.life ?? 0.6;
  for (let i = 0; i < count; i += 1) {
    const angle = options.angle === undefined
      ? rng() * Math.PI * 2
      : options.angle + between(rng, -scatter, scatter);
    const force = between(rng, scatter * 0.4, scatter * 2.2);
    if (world.effects.bits.length >= MAX_BITS) world.effects.bits.shift();
    world.effects.bits.push({
      kind, x, y,
      vx: Math.cos(angle) * force + (options.vx ?? 0),
      vy: Math.sin(angle) * force + (options.vy ?? 0),
      life: life * between(rng, 0.7, 1.3),
      full: life * 1.3,
      size: size * between(rng, 0.65, 1.4),
      color: tint,
      angle: options.angle ?? 0,
      floats: kind === 'smoke' || kind === 'dust',
    });
  }
}

export function markTire(world, x, y, angle, strength = 1) {
  if (world.effects.treads.length >= MAX_TREADS) world.effects.treads.shift();
  world.effects.treads.push({ x, y, angle, life: 7, strength });
}

export function screenTint(world, color, opacity, life = 0.18) {
  world.effects.tints.push({ color, opacity, life, full: life });
}

export function flashLight(world, x, y, color, radius, life = 0.12) {
  world.effects.flares.push({ x, y, color, radius, life, full: life });
}

export function stepEffects(world, dt) {
  const bits = world.effects.bits;
  for (let i = bits.length - 1; i >= 0; i -= 1) {
    const bit = bits[i];
    bit.life -= dt;
    if (bit.life <= 0) {
      bits.splice(i, 1);
      continue;
    }
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    if (bit.floats) {
      bit.vy -= 16 * dt;
      bit.size += 8 * dt;
    } else {
      bit.vx *= 1 - dt * 2.4;
      bit.vy *= 1 - dt * 2.4;
    }
  }

  for (let i = world.effects.treads.length - 1; i >= 0; i -= 1) {
    world.effects.treads[i].life -= dt;
    if (world.effects.treads[i].life <= 0) world.effects.treads.splice(i, 1);
  }

  for (const key of ['tints', 'flares']) {
    for (let i = world.effects[key].length - 1; i >= 0; i -= 1) {
      world.effects[key][i].life -= dt;
      if (world.effects[key][i].life <= 0) world.effects[key].splice(i, 1);
    }
  }
}

export function paintTreads(ctx, world, view) {
  ctx.save();
  ctx.lineWidth = 2.4;
  for (const tread of world.effects.treads) {
    if (tread.x < view.left || tread.x > view.right || tread.y < view.top || tread.y > view.bottom) continue;
    ctx.strokeStyle = `rgba(30,28,30,${Math.min(0.4, tread.life / 18) * tread.strength})`;
    ctx.beginPath();
    ctx.moveTo(tread.x, tread.y);
    ctx.lineTo(tread.x - Math.cos(tread.angle) * 7, tread.y - Math.sin(tread.angle) * 7);
    ctx.stroke();
  }
  ctx.restore();
}

export function paintBits(ctx, world) {
  ctx.save();
  for (const bit of world.effects.bits) {
    ctx.globalAlpha = Math.min(1, Math.max(0, bit.life / bit.full) * 1.4);
    ctx.fillStyle = bit.color;
    ctx.beginPath();
    if (bit.kind === 'muzzle') {
      ctx.moveTo(bit.x + Math.cos(bit.angle) * bit.size * 2.4, bit.y + Math.sin(bit.angle) * bit.size * 2.4);
      ctx.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2);
    } else {
      ctx.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

export function paintFlares(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const flare of world.effects.flares) {
    const strength = flare.life / flare.full;
    const glow = ctx.createRadialGradient(flare.x, flare.y, 0, flare.x, flare.y, flare.radius);
    glow.addColorStop(0, flare.color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = strength * 0.55;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(flare.x, flare.y, flare.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function paintTints(ctx, world) {
  for (const tint of world.effects.tints) {
    ctx.save();
    ctx.globalAlpha = tint.opacity * Math.max(0, tint.life / tint.full);
    ctx.fillStyle = tint.color;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}
