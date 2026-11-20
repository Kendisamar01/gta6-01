import { COLORS, FONT } from './config.js';
import { vehicleSpec } from './vehicles.js';

function dropShadow(ctx, x, y, radiusX, radiusY) {
  ctx.fillStyle = 'rgba(20,28,32,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function emergencyBar(ctx, length, phase) {
  const redActive = Math.floor(phase) % 2 === 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = redActive ? 'rgba(255,64,64,0.7)' : 'rgba(64,120,255,0.7)';
  ctx.beginPath();
  ctx.arc(-length / 2 + 12, -5, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = redActive ? 'rgba(64,120,255,0.7)' : 'rgba(255,64,64,0.7)';
  ctx.beginPath();
  ctx.arc(-length / 2 + 12, 5, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawVehicle(ctx, car) {
  if (!car.alive) return;
  const spec = vehicleSpec(car);
  const halfLength = spec.length / 2;
  const halfWidth = spec.width / 2;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  dropShadow(ctx, 5, 7, spec.length * 0.58, spec.width * 0.7);

  ctx.fillStyle = '#20252a';
  for (const side of [-1, 1]) {
    for (const offset of [-spec.length * 0.31, spec.length * 0.31]) {
      ctx.fillRect(offset - 7, side * (halfWidth + 1), 14, 5);
    }
  }

  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-halfLength, -halfWidth, spec.length, spec.width, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(22,28,32,0.65)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-halfLength + 6, -halfWidth + 3, spec.length - 12, 3);
  ctx.fillStyle = 'rgba(25,39,46,0.78)';
  ctx.beginPath();
  ctx.roundRect(-spec.length * 0.18, -halfWidth + 4, spec.length * 0.36, spec.width - 8, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,200,210,0.35)';
  ctx.fillRect(-spec.length * 0.05, -halfWidth + 5, 2, spec.width - 10);

  ctx.fillStyle = 'rgba(255,246,220,0.8)';
  ctx.fillRect(halfLength - 6, -halfWidth + 4, 4, 5);
  ctx.fillRect(halfLength - 6, halfWidth - 9, 4, 5);
  ctx.fillStyle = '#b9423d';
  ctx.fillRect(-halfLength + 2, -halfWidth + 4, 4, 5);
  ctx.fillRect(-halfLength + 2, halfWidth - 9, 4, 5);

  if (car.type === 'police') {
    ctx.fillStyle = '#24324a';
    ctx.fillRect(-halfLength + 4, -halfWidth + 5, spec.length - 8, 5);
    ctx.fillRect(-halfLength + 4, halfWidth - 10, spec.length - 8, 5);
    emergencyBar(ctx, spec.length, car.sirenPhase ?? 0);
  }
  if (car.type === 'taxi') {
    ctx.fillStyle = '#202a30';
    ctx.fillRect(-6, -9, 12, 4);
  }

  const damage = 1 - car.hp / car.maxHp;
  if (damage > 0.18) {
    ctx.strokeStyle = 'rgba(45,35,30,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-spec.length * 0.36, -spec.width * 0.2);
    ctx.lineTo(-spec.length * 0.2, spec.width * 0.06);
    ctx.lineTo(-spec.length * 0.05, -spec.width * 0.12);
    ctx.stroke();
  }
  if (car.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${car.flash * 2})`;
    ctx.fillRect(-halfLength, -halfWidth, spec.length, spec.width);
  }
  ctx.restore();
}

export function drawPed(ctx, ped) {
  if (!ped.alive) return;
  const stride = Math.sin(ped.stepHint * 10) * (ped.mode === 'flee' ? 5 : 3);
  ctx.save();
  ctx.translate(ped.x, ped.y);
  dropShadow(ctx, 3, 6, 8, 4);
  ctx.strokeStyle = '#303840';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.lineTo(-3 - stride, 10);
  ctx.moveTo(2, 2);
  ctx.lineTo(3 + stride, 10);
  ctx.stroke();
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.roundRect(-6, -10, 12, 14, 5);
  ctx.fill();
  ctx.strokeStyle = ped.skin;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(-9, 1 + stride * 0.5);
  ctx.moveTo(5, -6);
  ctx.lineTo(9, 1 - stride * 0.5);
  ctx.stroke();
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(0, -14, 5, 0, Math.PI * 2);
  ctx.fill();
  if (ped.type === 'police') {
    ctx.fillStyle = '#1e2c48';
    ctx.fillRect(-6, -19, 12, 4);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-1, -11, 2, 7);
  } else if (ped.type === 'enemy') {
    ctx.fillStyle = '#d45c55';
    ctx.fillRect(-6, -11, 12, 3);
  }
  ctx.restore();
}

export function drawPlayer(ctx, world) {
  const player = world.player;
  if (player.inVehicle !== null) return;
  if (player.invulnerable > 0 && Math.floor(world.stepHint * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  dropShadow(ctx, 4, 8, 10, 5);
  const stride = Math.sin(world.stepHint * 10) * 3;
  ctx.strokeStyle = '#263740';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-3, 3);
  ctx.lineTo(-4 - stride, 13);
  ctx.moveTo(3, 3);
  ctx.lineTo(4 + stride, 13);
  ctx.stroke();
  ctx.fillStyle = '#2b6f88';
  ctx.beginPath();
  ctx.roundRect(-8, -13, 16, 19, 6);
  ctx.fill();
  ctx.fillStyle = '#d7a47c';
  ctx.beginPath();
  ctx.arc(0, -18, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d312b';
  ctx.fillRect(-6, -23, 12, 4);
  ctx.rotate(player.angle);
  ctx.strokeStyle = '#d7a47c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(4, -7);
  ctx.lineTo(17, 0);
  ctx.stroke();
  if (player.weapon === 'pistol') {
    ctx.fillStyle = '#2a3138';
    ctx.fillRect(15, -2, 12, 4);
    if (player.flash > 0) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(29, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBullets(ctx, world) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const bullet of world.bullets) {
    const color = bullet.owner === 'police' ? '#9ec8ff' : bullet.owner === 'enemy' ? '#ff9a7d' : COLORS.gold;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 0.016, bullet.y - bullet.vy * 0.016);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPickup(ctx, pickup) {
  const lift = pickup.y + Math.sin(pickup.bob) * 3;
  const icons = {
    pistol: { color: '#e8c05a', glyph: 'P' },
    armor: { color: '#65b8d8', glyph: 'A' },
    health: { color: '#e56b62', glyph: '+' },
    cash: { color: '#8fd38a', glyph: '$' },
  };
  const icon = icons[pickup.type] ?? icons.cash;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = icon.color;
  ctx.beginPath();
  ctx.arc(pickup.x, lift, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = icon.color;
  ctx.beginPath();
  ctx.roundRect(pickup.x - 10, lift - 10, 20, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#17242b';
  ctx.font = `900 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(icon.glyph, pickup.x, lift + 5);
  ctx.restore();
}

export function drawPickups(ctx, world) {
  for (const pickup of world.pickups) {
    if (pickup.active) drawPickup(ctx, pickup);
  }
}

export function drawRoadblocks(ctx, world) {
  for (const block of world.roadblocks) {
    ctx.save();
    ctx.translate(block.x, block.y);
    ctx.rotate(block.angle);
    ctx.fillStyle = '#2b343a';
    ctx.fillRect(-58, -5, 116, 10);
    for (let x = -50; x < 50; x += 20) {
      ctx.fillStyle = block.flash > 0 ? '#ffd166' : '#e9e4d5';
      ctx.fillRect(x, -5, 10, 10);
    }
    for (const x of [-70, 70]) {
      ctx.fillStyle = '#e8783f';
      ctx.beginPath();
      ctx.moveTo(x - 8, 8);
      ctx.lineTo(x + 8, 8);
      ctx.lineTo(x, -10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f1e8d3';
      ctx.fillRect(x - 5, -1, 10, 3);
    }
    ctx.restore();
  }
}

export function drawEntities(ctx, world, bounds) {
  drawRoadblocks(ctx, world);
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    if (car.x < bounds.left - 100 || car.x > bounds.right + 100
      || car.y < bounds.top - 100 || car.y > bounds.bottom + 100) continue;
    drawVehicle(ctx, car);
  }
  for (const ped of world.peds) {
    if (ped.x < bounds.left - 40 || ped.x > bounds.right + 40
      || ped.y < bounds.top - 40 || ped.y > bounds.bottom + 40) continue;
    drawPed(ctx, ped);
  }
  drawPickups(ctx, world);
  drawPlayer(ctx, world);
  drawBullets(ctx, world);
}
