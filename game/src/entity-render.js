import { SOLARA, VEHICLE_TYPES } from './config.js';
import { isNight } from './world.js';
import { visibleRect } from './camera.js';

function nearby(x, y, view, margin = 60) {
  return x > view.x - margin && x < view.x + view.w + margin && y > view.y - margin && y < view.y + view.h + margin;
}

function drawShadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = SOLARA.shadow;
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 5, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawVehicle(ctx, car, night) {
  const spec = VEHICLE_TYPES[car.type] || VEHICLE_TYPES.sedan;
  const halfL = spec.length / 2;
  const halfW = spec.width / 2;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  drawShadow(ctx, 0, 0, halfL * 1.02, halfW * 1.06);
  ctx.fillStyle = car.color || spec.color;
  ctx.beginPath();
  ctx.roundRect(-halfL, -halfW, spec.length, spec.width, 9);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,34,42,0.72)';
  ctx.beginPath();
  ctx.roundRect(-halfL * 0.28, -halfW + 5, spec.length * 0.42, spec.width - 10, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-halfL * 0.24, -halfW + 7, spec.length * 0.14, spec.width - 14);
  ctx.fillStyle = car.type === 'cruiser' ? '#2f5f9c' : 'rgba(30,48,54,0.5)';
  ctx.fillRect(-halfL * 0.85, -halfW + 6, 4, spec.width - 12);
  ctx.fillStyle = night ? '#fff3bd' : '#e9f4f0';
  ctx.fillRect(halfL - 5, -halfW + 4, 4, 6);
  ctx.fillRect(halfL - 5, halfW - 10, 4, 6);
  ctx.fillStyle = '#c83f3f';
  ctx.fillRect(-halfL + 1, -halfW + 4, 3, 6);
  ctx.fillRect(-halfL + 1, halfW - 10, 3, 6);
  if (car.type === 'taxi') {
    ctx.fillStyle = '#26333a';
    ctx.fillRect(-9, -halfW - 2, 18, 5);
  }
  if (car.damage > 45) {
    ctx.fillStyle = 'rgba(35,32,30,0.55)';
    ctx.beginPath();
    ctx.moveTo(-halfL * 0.5, -halfW);
    ctx.lineTo(-halfL * 0.15, -halfW + 8);
    ctx.lineTo(-halfL * 0.3, -halfW + 2);
    ctx.fill();
  }
  ctx.restore();
  if (car.damage > 78 && Math.floor(car.smokeClock * 6) % 2 === 0) {
    ctx.fillStyle = 'rgba(55,55,60,0.42)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.horn > 0) {
    ctx.fillStyle = 'rgba(255,225,120,0.7)';
    ctx.beginPath();
    ctx.arc(car.x + Math.cos(car.angle) * 50, car.y + Math.sin(car.angle) * 50, 6 + Math.sin(car.horn * 14) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPed(ctx, ped) {
  const colors = ['#f0c46b', '#dc7164', '#68b6c7', '#dbd5c4', '#a48bd0', '#8bc47f'];
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.rotate(ped.angle || 0);
  drawShadow(ctx, 0, 0, 9, 7);
  const color = ped.color || colors[ped.skin % colors.length];
  const stride = ped.moving ? Math.sin((ped.anim || 0) * 12) * 3 : 0;
  ctx.fillStyle = '#33404a';
  ctx.fillRect(-5, -8 + stride, 4, 8);
  ctx.fillRect(-5, 3 - stride, 4, 8);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-6, -7, 13, 14, 4);
  ctx.fill();
  ctx.fillStyle = '#e8b98f';
  ctx.beginPath();
  ctx.arc(3, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();
  if (ped.armed) {
    ctx.fillStyle = '#3a434a';
    ctx.fillRect(6, -2, 10, 4);
  }
  ctx.restore();
  if (ped.flee > 0) {
    ctx.fillStyle = 'rgba(255,120,90,0.85)';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', ped.x, ped.y - 18);
  }
}

function drawPlayer(ctx, world, night) {
  const player = world.player;
  if (player.inVehicle !== null) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  drawShadow(ctx, 0, 0, 13, 11);
  const stride = player.walking ? Math.sin(world.elapsed * (player.running ? 19 : 12)) * 4 : 0;
  ctx.fillStyle = '#263c52';
  ctx.fillRect(-7, -8 + stride, 5, 10);
  ctx.fillRect(-7, 3 - stride, 5, 10);
  ctx.fillStyle = '#e75f4d';
  ctx.beginPath();
  ctx.roundRect(-8, -9, 18, 18, 5);
  ctx.fill();
  ctx.fillStyle = '#f0c59a';
  ctx.beginPath();
  ctx.arc(3, 0, 6.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f3942';
  ctx.fillRect(-2, -11, 12, 4);
  const gun = player.weapon !== 'fists';
  const reach = 12 + (player.swing > 0 ? Math.sin((1 - player.swing) * Math.PI) * 9 : 0);
  ctx.strokeStyle = gun ? '#3b444b' : '#e8b98f';
  ctx.lineWidth = gun ? 4 : 6;
  ctx.beginPath();
  ctx.moveTo(6, gun ? -4 : -7);
  ctx.lineTo(6 + reach, gun ? -4 : -2 - player.swing * 8);
  ctx.stroke();
  if (gun && player.swing > 0.55) {
    ctx.fillStyle = '#ffe8a0';
    ctx.beginPath();
    ctx.moveTo(6 + reach, -6);
    ctx.lineTo(24 + reach, -9);
    ctx.lineTo(6 + reach, -1);
    ctx.fill();
  }
  if (player.armor > 0) {
    ctx.strokeStyle = 'rgba(130,195,230,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.restore();
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets(ctx, world) {
  ctx.lineCap = 'round';
  for (const bullet of world.bullets) {
    ctx.strokeStyle = bullet.color || '#ffe6a2';
    ctx.lineWidth = bullet.heavy ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 0.026, bullet.y - bullet.vy * 0.026);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawEffects(ctx, world) {
  for (const effect of world.effects) {
    const alpha = Math.max(0, effect.life / (effect.max || 1));
    if (effect.kind === 'ring') {
      ctx.strokeStyle = effect.color || 'rgba(255,210,120,0.8)';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, (1 - alpha) * (effect.size || 40) + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = alpha * (effect.opacity || 1);
      ctx.fillStyle = effect.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, (effect.size || 6) * (0.5 + alpha)), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawMarker(ctx, world) {
  const target = world.mission.target;
  if (!target) return;
  const pulse = 1 + Math.sin(world.elapsed * 4) * 0.09;
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(255,209,102,0.24)';
  ctx.fillRect(-23 * pulse, -23 * pulse, 46 * pulse, 46 * pulse);
  ctx.strokeStyle = SOLARA.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(-16 * pulse, -16 * pulse, 32 * pulse, 32 * pulse);
  ctx.restore();
  ctx.fillStyle = 'rgba(15,27,38,0.75)';
  ctx.fillRect(target.x - 54, target.y - 54, 108, 20);
  ctx.fillStyle = SOLARA.accent;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((target.label || 'OBJECTIVE').toUpperCase(), target.x, target.y - 44);
}

function drawLandmarks(ctx, world, view) {
  for (const place of world.city.landmarks) {
    if (!nearby(place.x, place.y, view, 0)) continue;
    if (place.type === 'spray' || place.type === 'hospital') {
      ctx.fillStyle = place.type === 'spray' ? 'rgba(107,224,190,0.9)' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(place.x, place.y - 34, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#18313b';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(place.type === 'spray' ? '$' : '+', place.x, place.y - 34);
    }
  }
}

export function drawEntities(ctx, world, camera) {
  const view = visibleRect(camera, 90);
  const night = isNight(world);
  for (const skid of world.skids) {
    ctx.globalAlpha = Math.max(0, skid.life / (skid.max || 1)) * 0.45;
    ctx.fillStyle = '#20282e';
    ctx.fillRect(skid.x, skid.y, skid.w, skid.h);
  }
  ctx.globalAlpha = 1;
  for (const pickup of world.pickups) {
    if (!nearby(pickup.x, pickup.y, view)) continue;
    const bob = Math.sin(world.elapsed * 3 + pickup.x) * 3;
    ctx.fillStyle = 'rgba(255,209,102,0.24)';
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SOLARA.accent;
    ctx.fillRect(pickup.x - 10, pickup.y - 5 + bob, 20, 10);
    ctx.fillStyle = '#26333a';
    ctx.fillRect(pickup.x + 6, pickup.y - 2 + bob, 8, 4);
  }
  for (const car of world.vehicles) {
    if (nearby(car.x, car.y, view)) drawVehicle(ctx, car, night);
  }
  for (const ped of world.peds) {
    if (nearby(ped.x, ped.y, view)) drawPed(ctx, ped);
  }
  drawBullets(ctx, world);
  drawEffects(ctx, world);
  drawPlayer(ctx, world, night);
  drawLandmarks(ctx, world, view);
  drawMarker(ctx, world);
}
