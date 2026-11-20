import { FIELD, SOLARA } from './config.js';
import { worldToScreen } from './camera.js';

function nightAmount(world) {
  const t = world.time;
  if (t >= 7 && t <= 17.5) return 0;
  if (t < 5.3 || t > 20) return 0.62;
  if (t < 7) return ((7 - t) / 1.7) * 0.62;
  return ((t - 17.5) / 2.5) * 0.62;
}

export function drawEnvironment(ctx, world, camera) {
  const darkness = nightAmount(world);
  if (darkness > 0.01) {
    ctx.fillStyle = `rgba(10,20,48,${darkness})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const light of world.city.lights) {
      const screen = worldToScreen(camera, light.x, light.y);
      if (screen.x < -140 || screen.x > FIELD.width + 140 || screen.y < -140 || screen.y > FIELD.height + 140) continue;
      const glow = ctx.createRadialGradient(screen.x, screen.y, 3, screen.x, screen.y, light.radius);
      glow.addColorStop(0, `rgba(255,216,140,${0.21 * darkness})`);
      glow.addColorStop(1, 'rgba(255,216,140,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    const lights = world.vehicles.length ? world.vehicles : [];
    for (const car of lights) {
      const screen = worldToScreen(camera, car.x, car.y);
      if (screen.x < -120 || screen.x > FIELD.width + 120 || screen.y < -120 || screen.y > FIELD.height + 120) continue;
      const angle = car.angle;
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(angle);
      const cone = ctx.createLinearGradient(20, 0, 190, 0);
      cone.addColorStop(0, 'rgba(255,238,180,0.24)');
      cone.addColorStop(1, 'rgba(255,238,180,0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(18, -9);
      ctx.lineTo(190, -46);
      ctx.lineTo(190, 46);
      ctx.lineTo(18, 9);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (world.time > 17.2 && world.time < 19.3) {
    const strength = 1 - Math.abs(world.time - 18.25) / 1.05;
    ctx.fillStyle = `rgba(255,156,84,${Math.max(0, strength) * 0.14})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  const vignette = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, 260, FIELD.width / 2, FIELD.height / 2, 810);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(8,16,24,0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(240,80,70,${Math.min(0.35, world.flash * 0.32)})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  if (world.intro < 1 && world.screen !== 'title') {
    ctx.fillStyle = `rgba(10,20,28,${1 - world.intro})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  ctx.fillStyle = SOLARA.text;
}
