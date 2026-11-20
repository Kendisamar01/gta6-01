import { createRandom } from './random.js';

const LIMIT = 320;

const KINDS = {
  smoke: { speed: 26, life: 1.5, size: 7, color: '#9aa4a8', drag: 0.9, grow: 9 },
  exhaust: { speed: 18, life: 0.9, size: 4, color: '#c2c8c6', drag: 0.94, grow: 5 },
  dust: { speed: 40, life: 0.7, size: 5, color: '#d6c69d', drag: 0.86, grow: 4 },
  spark: { speed: 150, life: 0.32, size: 2.6, color: '#ffd36a', drag: 0.82, grow: -1 },
  glass: { speed: 110, life: 0.5, size: 2.4, color: '#bfe9f2', drag: 0.88, grow: -0.5 },
  puff: { speed: 58, life: 0.55, size: 4.5, color: '#c4524d', drag: 0.84, grow: 3 },
  muzzle: { speed: 22, life: 0.11, size: 7, color: '#fff1a8', drag: 0.8, grow: 8 },
  fire: { speed: 30, life: 0.65, size: 6, color: '#ff9d3c', drag: 0.93, grow: 6 },
  ring: { speed: 95, life: 0.45, size: 9, color: '#ffd07a', drag: 0.85, grow: 22 },
  water: { speed: 70, life: 0.6, size: 4, color: '#bde6e9', drag: 0.9, grow: 2 },
};

export function createEffects(world) {
  const state = world.state;
  const random = createRandom(state.seed ^ 0x51f00d);
  if (!Array.isArray(state.fx)) state.fx = [];
  if (!Array.isArray(state.decals)) state.decals = [];
  state.flash = null;

  function emit(kind, x, y, count, spread = Math.PI * 2, direction = 0) {
    const preset = KINDS[kind] || KINDS.dust;
    for (let index = 0; index < count; index += 1) {
      if (state.fx.length >= LIMIT) state.fx.shift();
      const angle = spread === Math.PI * 2 ? random() * spread : direction + (random() - 0.5) * spread;
      const speed = preset.speed * (0.4 + random() * 0.9);
      const life = preset.life * (0.65 + random() * 0.7);
      state.fx.push({
        kind,
        x: x + (random() - 0.5) * 6,
        y: y + (random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        max: life,
        size: preset.size * (0.7 + random() * 0.6),
        color: preset.color,
        drag: preset.drag,
        grow: preset.grow,
      });
    }
  }

  function muzzle(x, y, angle) {
    emit('muzzle', x + Math.cos(angle) * 15, y + Math.sin(angle) * 15, 5, 0.7, angle);
    emit('spark', x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, 3, 0.5, angle);
    flash('shot');
  }

  function impact(x, y, kind) {
    if (kind === 'blood') emit('puff', x, y, 7);
    else if (kind === 'metal') emit('spark', x, y, 8);
    else if (kind === 'water') emit('water', x, y, 9);
    else emit('dust', x, y, 6);
  }

  function explosion(x, y) {
    emit('ring', x, y, 2);
    emit('fire', x, y, 16);
    emit('smoke', x, y, 14);
    emit('spark', x, y, 20);
    flash('boom');
  }

  function skid(x, y, angle, strength) {
    if (state.decals.length > 420) state.decals.shift();
    state.decals.push({ x, y, angle, life: 7, max: 7, strength: Math.min(1, strength) });
  }

  function flash(kind) {
    state.flash = { kind, life: kind === 'boom' ? 0.32 : 0.13, max: kind === 'boom' ? 0.32 : 0.13 };
  }

  function step(dt) {
    for (let index = state.fx.length - 1; index >= 0; index -= 1) {
      const particle = state.fx[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        state.fx.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const damping = Math.pow(particle.drag, dt * 60);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.size += particle.grow * dt;
    }
    for (let index = state.decals.length - 1; index >= 0; index -= 1) {
      state.decals[index].life -= dt;
      if (state.decals[index].life <= 0) state.decals.splice(index, 1);
    }
    if (state.flash) {
      state.flash.life -= dt;
      if (state.flash.life <= 0) state.flash = null;
    }
    if (state.smokeClock === undefined) state.smokeClock = 0;
  }

  function reset() {
    state.fx.length = 0;
    state.decals.length = 0;
    state.flash = null;
  }

  return { emit, muzzle, impact, explosion, skid, flash, step, reset };
}

let manager = null;

export function install(context) {
  manager = createEffects(context.world);
  context.systems.effects = manager;
}

export function burst(kind, x, y, count, spread, direction) {
  if (manager) manager.emit(kind, x, y, count, spread, direction);
}

export function muzzle(x, y, angle) {
  if (manager) manager.muzzle(x, y, angle);
}

export function impact(x, y, kind) {
  if (manager) manager.impact(x, y, kind);
}

export function explosion(x, y) {
  if (manager) manager.explosion(x, y);
}

export function skid(x, y, angle, strength) {
  if (manager) manager.skid(x, y, angle, strength);
}

export function flash(kind) {
  if (manager) manager.flash(kind);
}

export function drawEffects(context, state, now) {
  const decals = state.decals;
  if (Array.isArray(decals)) {
    for (let index = 0; index < decals.length; index += 1) {
      const mark = decals[index];
      const alpha = 0.07 + 0.17 * (mark.life / mark.max) * mark.strength;
      context.save();
      context.translate(mark.x, mark.y);
      context.rotate(mark.angle);
      context.fillStyle = `rgba(30, 32, 35, ${alpha})`;
      context.fillRect(-5, -2, 10, 4);
      context.restore();
    }
  }
  const particles = state.fx;
  if (!Array.isArray(particles)) return;
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const alpha = Math.max(0, particle.life / particle.max);
    const size = Math.max(0.5, particle.size);
    if (particle.kind === 'ring') {
      context.strokeStyle = `rgba(255, 208, 122, ${alpha * 0.8})`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      context.stroke();
      continue;
    }
    context.globalAlpha = particle.kind === 'smoke' || particle.kind === 'exhaust' ? alpha * 0.45 : alpha;
    context.fillStyle = particle.color;
    if (particle.kind === 'spark' || particle.kind === 'glass') {
      context.fillRect(particle.x - size * 0.4, particle.y - size * 1.6, size * 0.8, size * 3);
    } else {
      context.beginPath();
      context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;
}
