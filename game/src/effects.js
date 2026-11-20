import { between, pick } from './random.js';
import { TAU } from './util.js';

const MAX_PARTICLES = 520;

export function createEffectSystem(api) {
  const { state, rng } = api;
  const particles = [];
  const skids = [];

  function particle(x, y, vx, vy, life, size, color, gravity = 0, drag = 0.9, kind = 'dot') {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({ x, y, vx, vy, life, maxLife: life, size, color, gravity, drag, kind });
  }

  function burst(x, y, color, count = 10, speed = 120) {
    for (let index = 0; index < count; index += 1) {
      const angle = between(rng, 0, TAU);
      const velocity = between(rng, speed * 0.3, speed);
      particle(x, y, Math.cos(angle) * velocity, Math.sin(angle) * velocity, between(rng, 0.25, 0.7), between(rng, 2, 5), color, 90, 0.94);
    }
  }

  function spark(x, y, color = '#ffd36e', count = 5) {
    burst(x, y, color, count, 165);
  }

  function blood(x, y, count = 6) {
    burst(x, y, '#c44d52', count, 92);
  }

  function muzzle(x, y, angle) {
    for (let index = 0; index < 6; index += 1) {
      const spread = angle + between(rng, -0.32, 0.32);
      const velocity = between(rng, 90, 260);
      particle(x, y, Math.cos(spread) * velocity, Math.sin(spread) * velocity, between(rng, 0.06, 0.16), between(rng, 2, 5), pick(rng, ['#fff1b8', '#ffc75c', '#ff8a45']), 0, 0.86);
    }
  }

  function smoke(x, y, count = 2) {
    for (let index = 0; index < count; index += 1) {
      particle(x + between(rng, -6, 6), y + between(rng, -6, 6), between(rng, -12, 12), between(rng, -34, -12), between(rng, 0.8, 1.7), between(rng, 7, 14), 'rgba(92, 99, 106, 0.52)', -6, 0.985, 'soft');
    }
  }

  function fire(x, y, count = 2) {
    for (let index = 0; index < count; index += 1) {
      particle(x + between(rng, -5, 5), y + between(rng, -5, 5), between(rng, -10, 10), between(rng, -45, -18), between(rng, 0.2, 0.5), between(rng, 4, 9), pick(rng, ['#ffb03a', '#ff6e35', '#ffde72']), -30, 0.96, 'soft');
    }
  }

  function explosion(x, y) {
    burst(x, y, '#ffd86a', 28, 330);
    burst(x, y, '#ff6d3a', 18, 230);
    for (let index = 0; index < 16; index += 1) {
      particle(x, y, between(rng, -30, 30), between(rng, -48, -12), between(rng, 1, 2.3), between(rng, 14, 26), 'rgba(62, 66, 70, 0.58)', -8, 0.985, 'soft');
    }
  }

  function skid(x, y, angle) {
    if (skids.length > 260) skids.shift();
    skids.push({ x, y, angle, life: 14 });
  }

  function toast(message) {
    if (!message) return;
    state.toasts.push({ message, life: 4.2 });
    if (state.toasts.length > 5) state.toasts.shift();
  }

  function reset() {
    particles.length = 0;
    skids.length = 0;
    state.toasts.length = 0;
  }

  function step(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const item = particles[index];
      item.life -= dt;
      if (item.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      item.vy += item.gravity * dt;
      item.vx *= item.drag;
      item.vy *= item.drag;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
    }
    for (let index = skids.length - 1; index >= 0; index -= 1) {
      skids[index].life -= dt;
      if (skids[index].life <= 0) skids.splice(index, 1);
    }
    for (let index = state.toasts.length - 1; index >= 0; index -= 1) {
      state.toasts[index].life -= dt;
      if (state.toasts[index].life <= 0) state.toasts.splice(index, 1);
    }
  }

  return { particles, skids, reset, step, particle, burst, spark, blood, muzzle, smoke, fire, explosion, skid, toast };
}

export function draw(ctx, state) {
  const system = state.systems && state.systems.effects;
  if (!system) return;
  for (const mark of system.skids) {
    ctx.save();
    ctx.translate(mark.x, mark.y);
    ctx.rotate(mark.angle);
    ctx.fillStyle = `rgba(24, 28, 32, ${(Math.min(1, mark.life / 14) * 0.22).toFixed(3)})`;
    ctx.fillRect(-6, -10, 12, 3);
    ctx.fillRect(-6, 7, 12, 3);
    ctx.restore();
  }
  for (const item of system.particles) {
    const alpha = Math.min(1, item.life / item.maxLife);
    if (item.kind === 'soft') {
      ctx.fillStyle = item.color.replace(/[\d.]+\)$/, `${(alpha * 0.7).toFixed(3)})`);
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.size * (1.4 - alpha * 0.4), 0, TAU);
      ctx.fill();
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = item.color;
      ctx.fillRect(item.x - item.size / 2, item.y - item.size / 2, item.size, item.size);
      ctx.globalAlpha = 1;
    }
  }
}
