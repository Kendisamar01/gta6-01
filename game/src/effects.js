export function createEffects(world, camera) {
  const random = world.random;
  const particles = world.state.particles;
  const marks = [];
  world.state.marks = marks;

  function puff(x, y, color, count = 8, speed = 70, life = 0.5) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const velocity = speed * random.range(0.3, 1);
      particles.push({
        kind: 'puff', x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life, maximum: life, size: random.range(3, 8), color,
      });
    }
  }

  function spark(x, y) {
    for (let index = 0; index < 10; index += 1) {
      const angle = random() * Math.PI * 2;
      const velocity = random.range(60, 190);
      particles.push({
        kind: 'spark', x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.32, maximum: 0.32, size: random.range(1.5, 3),
        color: random.chance(0.5) ? '#ffd06a' : '#ff8a4c',
      });
    }
  }

  function smoke(x, y) {
    particles.push({
      kind: 'smoke', x: x + random.range(-6, 6), y: y + random.range(-6, 6),
      vx: random.range(-12, 12), vy: random.range(-26, -8),
      life: 1.4, maximum: 1.4, size: random.range(8, 16), color: 'rgba(48,52,58,0.55)',
    });
  }

  function explosion(x, y) {
    puff(x, y, '#ffb347', 26, 210, 0.75);
    puff(x, y, '#4d5157', 18, 120, 1.5);
    spark(x, y);
    camera.kick(18);
    if (world.systems.audio) world.systems.audio.explosion();
    if (world.systems.peds) world.systems.peds.panic(x, y, 320, 4);
  }

  function skid(x, y, angle) {
    marks.push({ x, y, angle, life: 9, maximum: 9 });
    if (marks.length > 420) marks.shift();
  }

  function toast(text, color = '#f6f3e8') {
    world.state.toasts.push({ text, color, life: 3.6, maximum: 3.6 });
    if (world.state.toasts.length > 5) world.state.toasts.shift();
  }

  function shake(amount) {
    camera.kick(amount);
  }

  function step(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const part = particles[index];
      part.life -= dt;
      if (part.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= 1 - Math.min(0.9, dt * 2.2);
      part.vy *= 1 - Math.min(0.9, dt * 2.2);
      if (part.kind === 'smoke') part.size += dt * 9;
    }
    for (let index = marks.length - 1; index >= 0; index -= 1) {
      marks[index].life -= dt;
      if (marks[index].life <= 0) marks.splice(index, 1);
    }
    for (let index = world.state.toasts.length - 1; index >= 0; index -= 1) {
      world.state.toasts[index].life -= dt;
      if (world.state.toasts[index].life <= 0) world.state.toasts.splice(index, 1);
    }
  }

  function drawWorld(context) {
    for (const mark of marks) {
      context.save();
      context.translate(mark.x, mark.y);
      context.rotate(mark.angle);
      context.fillStyle = `rgba(24,26,28,${0.24 * (mark.life / mark.maximum)})`;
      context.fillRect(-7, -2, 14, 4);
      context.restore();
    }
    for (const part of particles) {
      const alpha = Math.max(0, part.life / part.maximum);
      context.globalAlpha = part.kind === 'smoke' ? alpha * 0.7 : alpha;
      context.fillStyle = part.color;
      context.beginPath();
      context.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function reset() {
    particles.length = 0;
    marks.length = 0;
    world.state.toasts.length = 0;
  }

  return { puff, spark, smoke, explosion, skid, toast, shake, step, drawWorld, reset };
}
