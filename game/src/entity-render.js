function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPlayer(ctx, player, environment) {
  const bob = player.moving ? Math.sin(player.stepPhase * 2) * 2 : 0;
  ctx.fillStyle = 'rgba(24, 32, 38, 0.32)';
  ellipse(ctx, player.x + 3, player.y + 6, 13, 8);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#29364f';
  ctx.fillRect(-7, -8 + bob * 0.4, 7, 5);
  ctx.fillRect(-7, 3 - bob * 0.4, 7, 5);
  ctx.fillStyle = '#e8a13c';
  ctx.fillRect(-8, -8, 16, 16);
  ctx.fillStyle = '#f4bb62';
  ctx.fillRect(-2, -7, 6, 14);
  ctx.strokeStyle = '#d9a37a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(2, -6);
  ctx.lineTo(12, -4);
  ctx.moveTo(2, 6);
  ctx.lineTo(12, 4);
  ctx.stroke();
  ctx.fillStyle = '#d9a37a';
  ellipse(ctx, 6, 0, 7, 6.5);
  ctx.fillStyle = '#3b2a24';
  ellipse(ctx, 4, 0, 5, 6);
  if (environment.night) {
    ctx.fillStyle = 'rgba(255, 240, 190, 0.35)';
    ellipse(ctx, 12, 0, 10, 7);
  }
  ctx.restore();
}

export function drawPed(ctx, ped, environment) {
  ctx.fillStyle = 'rgba(24, 32, 38, 0.28)';
  ellipse(ctx, ped.x + 2, ped.y + 4, 10, 6);
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.rotate(ped.angle || 0);
  const sway = ped.moving ? Math.sin((ped.step || 0) * 2) * 2 : 0;
  ctx.fillStyle = '#344054';
  ctx.fillRect(-6, -7 + sway * 0.4, 6, 4);
  ctx.fillRect(-6, 3 - sway * 0.4, 6, 4);
  ctx.fillStyle = ped.color || '#8d6aa5';
  ctx.fillRect(-7, -6, 14, 12);
  ctx.fillStyle = '#d4a07c';
  ellipse(ctx, 5, 0, 6, 5.5);
  ctx.restore();
}

export function drawVehicle(ctx, vehicle, environment) {
  const width = vehicle.width || 44;
  const length = vehicle.length || 78;
  ctx.fillStyle = 'rgba(24, 32, 38, 0.34)';
  ctx.save();
  ctx.translate(vehicle.x + 4, vehicle.y + 5);
  ctx.rotate(vehicle.angle || 0);
  ellipse(ctx, 0, 0, length * 0.52, width * 0.55);
  ctx.restore();
  ctx.save();
  ctx.translate(vehicle.x, vehicle.y);
  ctx.rotate(vehicle.angle || 0);
  ctx.fillStyle = vehicle.color || '#d65b4a';
  ctx.fillRect(-length / 2, -width / 2, length, width);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(-length / 2 + 4, -width / 2 + 3, length - 8, 4);
  ctx.fillStyle = '#26313d';
  ctx.fillRect(-length * 0.16, -width / 2 + 5, length * 0.34, width - 10);
  ctx.fillStyle = '#f5e6b0';
  ctx.fillRect(length / 2 - 5, -width / 2 + 4, 4, 7);
  ctx.fillRect(length / 2 - 5, width / 2 - 11, 4, 7);
  ctx.fillStyle = '#c8453d';
  ctx.fillRect(-length / 2 + 1, -width / 2 + 4, 4, 7);
  ctx.fillRect(-length / 2 + 1, width / 2 - 11, 4, 7);
  if (environment.night) {
    ctx.fillStyle = 'rgba(255, 240, 180, 0.24)';
    ctx.beginPath();
    ctx.moveTo(length / 2, -width / 2);
    ctx.lineTo(length / 2 + 90, -width * 1.3);
    ctx.lineTo(length / 2 + 90, width * 1.3);
    ctx.lineTo(length / 2, width / 2);
    ctx.fill();
  }
  ctx.restore();
}
