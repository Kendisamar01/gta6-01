import { FONT, PALETTE } from './config.js';
import { carSpec } from './vehicles.js';

function shade(ctx, x, y, wide, tall) {
  ctx.fillStyle = 'rgba(20,28,32,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, wide, tall, 0, 0, Math.PI * 2);
  ctx.fill();
}

function emergencyGlow(ctx, length, phase) {
  const redFirst = Math.floor(phase) % 2 === 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = redFirst ? 'rgba(255,64,64,0.7)' : 'rgba(64,120,255,0.7)';
  ctx.beginPath();
  ctx.arc(-length / 2 + 12, -5, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = redFirst ? 'rgba(64,120,255,0.7)' : 'rgba(255,64,64,0.7)';
  ctx.beginPath();
  ctx.arc(-length / 2 + 12, 5, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function paintVehicle(ctx, car) {
  if (!car.alive) return;
  const spec = carSpec(car);
  const nose = spec.length / 2;
  const flank = spec.width / 2;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  shade(ctx, 5, 7, spec.length * 0.58, spec.width * 0.7);

  ctx.fillStyle = '#20252a';
  for (const side of [-1, 1]) {
    for (const offset of [-spec.length * 0.31, spec.length * 0.31]) {
      ctx.fillRect(offset - 7, side * (flank + 1), 14, 5);
    }
  }

  ctx.fillStyle = car.body;
  ctx.beginPath();
  ctx.roundRect(-nose, -flank, spec.length, spec.width, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(22,28,32,0.65)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-nose + 6, -flank + 3, spec.length - 12, 3);
  ctx.fillStyle = 'rgba(25,39,46,0.78)';
  ctx.beginPath();
  ctx.roundRect(-spec.length * 0.18, -flank + 4, spec.length * 0.36, spec.width - 8, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,200,210,0.35)';
  ctx.fillRect(-spec.length * 0.05, -flank + 5, 2, spec.width - 10);

  ctx.fillStyle = 'rgba(255,246,220,0.8)';
  ctx.fillRect(nose - 6, -flank + 4, 4, 5);
  ctx.fillRect(nose - 6, flank - 9, 4, 5);
  ctx.fillStyle = '#b9423d';
  ctx.fillRect(-nose + 2, -flank + 4, 4, 5);
  ctx.fillRect(-nose + 2, flank - 9, 4, 5);

  if (car.kind === 'police') {
    ctx.fillStyle = '#24324a';
    ctx.fillRect(-nose + 4, -flank + 5, spec.length - 8, 5);
    ctx.fillRect(-nose + 4, flank - 10, spec.length - 8, 5);
    emergencyGlow(ctx, spec.length, car.sirenWave);
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#202a30';
    ctx.fillRect(-6, -9, 12, 4);
  }

  const dent = 1 - car.hp / car.maxHp;
  if (dent > 0.18) {
    ctx.strokeStyle = 'rgba(45,35,30,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-spec.length * 0.36, -spec.width * 0.2);
    ctx.lineTo(-spec.length * 0.2, spec.width * 0.06);
    ctx.lineTo(-spec.length * 0.05, -spec.width * 0.12);
    ctx.stroke();
  }
  if (car.hitGlow > 0) {
    ctx.fillStyle = `rgba(255,255,255,${car.hitGlow * 2})`;
    ctx.fillRect(-nose, -flank, spec.length, spec.width);
  }
  ctx.restore();
}

export function paintPerson(ctx, person) {
  if (!person.alive) return;
  const swing = Math.sin(person.gait * 10) * (person.posture === 'flee' ? 5 : 3);
  ctx.save();
  ctx.translate(person.x, person.y);
  shade(ctx, 3, 6, 8, 4);
  ctx.strokeStyle = '#303840';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.lineTo(-3 - swing, 10);
  ctx.moveTo(2, 2);
  ctx.lineTo(3 + swing, 10);
  ctx.stroke();
  ctx.fillStyle = person.shirt;
  ctx.beginPath();
  ctx.roundRect(-6, -10, 12, 14, 5);
  ctx.fill();
  ctx.strokeStyle = person.skin;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(-9, 1 + swing * 0.5);
  ctx.moveTo(5, -6);
  ctx.lineTo(9, 1 - swing * 0.5);
  ctx.stroke();
  ctx.fillStyle = person.skin;
  ctx.beginPath();
  ctx.arc(0, -14, 5, 0, Math.PI * 2);
  ctx.fill();
  if (person.type === 'officer') {
    ctx.fillStyle = '#1e2c48';
    ctx.fillRect(-6, -19, 12, 4);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-1, -11, 2, 7);
  } else if (person.type === 'enemy') {
    ctx.fillStyle = '#d45c55';
    ctx.fillRect(-6, -11, 12, 3);
  }
  ctx.restore();
}

export function paintHero(ctx, world) {
  const player = world.player;
  if (player.carId !== null) return;
  if (player.guard > 0 && Math.floor(world.tickHint * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  shade(ctx, 4, 8, 10, 5);
  const swing = Math.sin(world.tickHint * 10) * 3;
  ctx.strokeStyle = '#263740';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-3, 3);
  ctx.lineTo(-4 - swing, 13);
  ctx.moveTo(3, 3);
  ctx.lineTo(4 + swing, 13);
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
    if (player.muzzle > 0) {
      ctx.fillStyle = PALETTE.amber;
      ctx.beginPath();
      ctx.arc(29, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function paintShots(ctx, world) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const bullet of world.bullets) {
    const color = bullet.owner === 'police' ? '#9ec8ff'
      : bullet.owner === 'enemy' ? '#ff9a7d' : PALETTE.amber;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx * 0.016, bullet.y - bullet.vy * 0.016);
    ctx.stroke();
  }
  ctx.restore();
}

const LOOT_ICONS = {
  pistol: { shade: '#e8c05a', mark: 'P' },
  armor: { shade: '#65b8d8', mark: 'A' },
  health: { shade: '#e56b62', mark: '+' },
  cash: { shade: '#8fd38a', mark: '$' },
};

function paintLoot(ctx, item) {
  if (!item.active) return;
  const lift = item.y + Math.sin(item.bob) * 3;
  const icon = LOOT_ICONS[item.kind] ?? LOOT_ICONS.cash;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = icon.shade;
  ctx.beginPath();
  ctx.arc(item.x, lift, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = icon.shade;
  ctx.beginPath();
  ctx.roundRect(item.x - 10, lift - 10, 20, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#17242b';
  ctx.font = `900 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(icon.mark, item.x, lift + 5);
  ctx.restore();
}

function paintBarriers(ctx, world) {
  for (const barrier of world.barriers) {
    ctx.save();
    ctx.translate(barrier.x, barrier.y);
    ctx.rotate(barrier.angle);
    ctx.fillStyle = '#2b343a';
    ctx.fillRect(-58, -5, 116, 10);
    for (let x = -50; x < 50; x += 20) {
      ctx.fillStyle = barrier.hitGlow > 0 ? '#ffd166' : '#e9e4d5';
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

export function paintEntities(ctx, world, view) {
  paintBarriers(ctx, world);
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    if (car.x < view.left - 100 || car.x > view.right + 100
      || car.y < view.top - 100 || car.y > view.bottom + 100) continue;
    paintVehicle(ctx, car);
  }
  for (const person of world.peds) {
    if (person.x < view.left - 40 || person.x > view.right + 40
      || person.y < view.top - 40 || person.y > view.bottom + 40) continue;
    paintPerson(ctx, person);
  }
  for (const item of world.loot) paintLoot(ctx, item);
  paintHero(ctx, world);
  paintShots(ctx, world);
}
