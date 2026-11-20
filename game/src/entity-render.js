import { PALETTE, PLAYER } from './config.js';

function rounded(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function shadow(context, x, y, width, height) {
  context.fillStyle = 'rgba(16,26,32,0.28)';
  context.beginPath();
  context.ellipse(x + 5, y + 7, width, height, 0, 0, Math.PI * 2);
  context.fill();
}

export function drawPlayer(context, player, environment) {
  if (player.invisible > 0 && Math.floor(player.invisible * 12) % 2 === 0) return;
  shadow(context, player.x, player.y, 19, 9);
  context.save();
  context.translate(player.x, player.y);
  context.rotate(player.aim);
  context.fillStyle = player.armor > 0 ? '#3f7fa2' : '#d96a4f';
  context.beginPath();
  context.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#e8c49b';
  context.beginPath();
  context.arc(5, 0, 9, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#22313b';
  context.fillRect(-8, -15, 12, 7);
  context.fillRect(-8, 8, 12, 7);
  if (player.weapon !== 'fists') {
    context.fillStyle = '#2c3540';
    context.fillRect(11, -3, 20, 6);
    context.fillStyle = '#66717c';
    context.fillRect(25, -2, 7, 4);
    if (player.flash > 0) {
      context.fillStyle = `rgba(255,224,130,${Math.min(1, player.flash * 8)})`;
      context.beginPath();
      context.moveTo(32, 0);
      context.lineTo(52, -10);
      context.lineTo(45, 0);
      context.lineTo(52, 10);
      context.closePath();
      context.fill();
    }
  } else if (player.punch > 0) {
    context.fillStyle = '#e8c49b';
    context.fillRect(10 + player.punch * 22, -5, 10, 10);
  }
  context.restore();
  if (player.armor > 0) {
    context.strokeStyle = 'rgba(125,203,242,0.85)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius + 4, 0, Math.PI * 2);
    context.stroke();
  }
  if (environment.lightsOn) {
    const glow = context.createRadialGradient(player.x, player.y, 4, player.x, player.y, 130);
    glow.addColorStop(0, 'rgba(255,222,155,0.13)');
    glow.addColorStop(1, 'rgba(255,222,155,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(player.x, player.y, 130, 0, Math.PI * 2);
    context.fill();
  }
}

export function drawVehicle(context, car, environment) {
  shadow(context, car.x, car.y, car.length * 0.55, car.width * 0.65);
  context.save();
  context.translate(car.x, car.y);
  context.rotate(car.angle);
  const length = car.length;
  const width = car.width;
  rounded(context, -length / 2, -width / 2, length, width, 9);
  context.fillStyle = car.color;
  context.fill();
  context.strokeStyle = 'rgba(12,22,30,0.55)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = car.police ? '#16233a' : '#2c485a';
  rounded(context, -length * 0.12, -width / 2 + 5, length * 0.42, width - 10, 4);
  context.fill();
  if (car.police) {
    context.fillStyle = '#f0f4f6';
    context.fillRect(-length * 0.45, -width / 2 + 2, length * 0.9, 5);
    context.fillRect(-length * 0.45, width / 2 - 7, length * 0.9, 5);
    context.fillStyle = '#284f92';
    context.fillRect(-4, -width / 2 + 2, 8, width - 4);
  }
  context.fillStyle = '#202a32';
  context.fillRect(-length / 2 + 8, -width / 2 - 2, 13, 5);
  context.fillRect(-length / 2 + 8, width / 2 - 3, 13, 5);
  context.fillRect(length / 2 - 21, -width / 2 - 2, 13, 5);
  context.fillRect(length / 2 - 21, width / 2 - 3, 13, 5);
  context.fillStyle = car.braking ? '#ff6a56' : '#f7cf7d';
  context.fillRect(length / 2 - 3, -width / 2 + 4, 4, 7);
  context.fillRect(length / 2 - 3, width / 2 - 11, 4, 7);
  context.fillStyle = '#c85c4c';
  context.fillRect(-length / 2, -width / 2 + 4, 4, 7);
  context.fillRect(-length / 2, width / 2 - 11, 4, 7);
  if (car.damage > 45) {
    context.strokeStyle = 'rgba(20,20,22,0.5)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(length * 0.12, -width * 0.2);
    context.lineTo(length * 0.22, width * 0.1);
    context.lineTo(length * 0.3, -width * 0.15);
    context.stroke();
  }
  if (environment.lightsOn && car.speed > 2) {
    context.fillStyle = 'rgba(255,236,176,0.24)';
    context.beginPath();
    context.moveTo(length / 2, -width / 2 + 6);
    context.lineTo(length / 2 + 150, -width / 2 - 46);
    context.lineTo(length / 2 + 150, width / 2 + 46);
    context.lineTo(length / 2, width / 2 - 6);
    context.closePath();
    context.fill();
  }
  if (car.siren && Math.floor(car.sirenClock * 6) % 2 === 0) {
    context.fillStyle = 'rgba(235,60,70,0.55)';
    context.fillRect(-4, -width / 2 - 8, 8, 6);
  } else if (car.siren) {
    context.fillStyle = 'rgba(70,125,240,0.6)';
    context.fillRect(-4, -width / 2 - 8, 8, 6);
  }
  context.restore();
}

export function drawPedestrian(context, ped) {
  shadow(context, ped.x, ped.y, 11, 5);
  context.save();
  context.translate(ped.x, ped.y);
  context.rotate(ped.angle);
  context.fillStyle = ped.color ?? '#c6a06b';
  context.beginPath();
  context.arc(0, 0, 9, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#e6c19a';
  context.beginPath();
  context.arc(5, 0, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = ped.scared ? '#e35b4f' : '#3c4d58';
  context.fillRect(-6, -10, 7, 4);
  context.fillRect(-6, 6, 7, 4);
  context.restore();
}

export function drawBullet(context, bullet) {
  context.strokeStyle = bullet.hostile ? '#ff8f7a' : '#ffe08a';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(bullet.x, bullet.y);
  context.lineTo(bullet.x - Math.cos(bullet.angle) * 14, bullet.y - Math.sin(bullet.angle) * 14);
  context.stroke();
}

const PICKUP_LOOK = {
  pistol: ['#f2c94c', 'P'],
  smg: ['#63c7d8', 'S'],
  health: ['#69d99a', '+'],
  armor: ['#77b7e8', 'A'],
  cash: ['#f2c94c', '$'],
};

export function drawPickup(context, pickup) {
  const look = PICKUP_LOOK[pickup.kind] ?? ['#ffffff', '?'];
  shadow(context, pickup.x, pickup.y, 12, 5);
  context.fillStyle = look[0];
  rounded(context, pickup.x - 12, pickup.y - 12 + Math.sin(pickup.bob) * 2, 24, 24, 5);
  context.fill();
  context.fillStyle = '#152433';
  context.font = 'bold 15px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(look[1], pickup.x, pickup.y + Math.sin(pickup.bob) * 2);
}

export function drawMarker(context, marker, clock) {
  const pulse = 1 + Math.sin(clock * 4) * 0.12;
  context.save();
  context.translate(marker.x, marker.y);
  const color = marker.color ?? PALETTE.accent;
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.globalAlpha = 0.85;
  context.beginPath();
  context.ellipse(0, 0, 34 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 0.18;
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(0, 0, 34 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, -54 - Math.sin(clock * 3) * 5);
  context.lineTo(-11, -36);
  context.lineTo(11, -36);
  context.closePath();
  context.fill();
  context.restore();
}

export function drawEntities(context, world, environment) {
  for (const pickup of world.pickups) if (pickup.active) drawPickup(context, pickup);
  for (const marker of world.markers) drawMarker(context, marker, world.clock);
  for (const ped of world.peds) drawPedestrian(context, ped);
  for (const car of world.vehicles) drawVehicle(context, car, environment);
  for (const car of world.policeCars) drawVehicle(context, car, environment);
  for (const bullet of world.bullets) drawBullet(context, bullet);
  drawPlayer(context, world.player, environment);
}
