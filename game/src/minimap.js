import { CITY, SOLARA } from './config.js';
import { SCREENS } from './config.js';

const MAP = { x: 1042, y: 468, size: 218 };

function mapPoint(world, x, y, scale, cx, cy) {
  return { x: cx + (x - world.player.x) * scale, y: cy + (y - world.player.y) * scale };
}

export function draw(ctx, world) {
  if (world.screen === SCREENS.title) return;
  const { x, y, size } = MAP;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const scale = 0.235;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 16);
  ctx.clip();
  ctx.fillStyle = 'rgba(12,27,36,0.94)';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#46544f';
  for (const building of world.city.buildings) {
    const point = mapPoint(world, building.x, building.y, scale, cx, cy);
    if (point.x < x - 30 || point.x > x + size + 30 || point.y < y - 30 || point.y > y + size + 30) continue;
    ctx.fillRect(point.x, point.y, Math.max(2, building.w * scale), Math.max(2, building.h * scale));
  }
  ctx.strokeStyle = 'rgba(232,222,178,0.55)';
  ctx.lineWidth = 1.5;
  const firstCol = Math.floor((world.player.x - 460) / CITY.cell);
  const lastCol = Math.ceil((world.player.x + 460) / CITY.cell);
  const firstRow = Math.floor((world.player.y - 460) / CITY.cell);
  const lastRow = Math.ceil((world.player.y + 460) / CITY.cell);
  for (let col = firstCol; col <= lastCol; col += 1) {
    const point = mapPoint(world, col * CITY.cell, 0, scale, cx, cy);
    ctx.beginPath();
    ctx.moveTo(point.x, y);
    ctx.lineTo(point.x, y + size);
    ctx.stroke();
  }
  for (let row = firstRow; row <= lastRow; row += 1) {
    const point = mapPoint(world, 0, row * CITY.cell, scale, cx, cy);
    ctx.beginPath();
    ctx.moveTo(x, point.y);
    ctx.lineTo(x + size, point.y);
    ctx.stroke();
  }
  for (const place of world.city.landmarks) {
    const point = mapPoint(world, place.x, place.y, scale, cx, cy);
    if (point.x < x || point.x > x + size || point.y < y || point.y > y + size) continue;
    ctx.fillStyle = place.type === 'police' ? SOLARA.police : 'rgba(255,255,255,0.7)';
    ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
  }
  for (const car of world.vehicles) {
    if (car.role !== 'police' || car.dead) continue;
    const point = mapPoint(world, car.x, car.y, scale, cx, cy);
    if (point.x < x || point.x > x + size || point.y < y || point.y > y + size) continue;
    ctx.fillStyle = '#ff6c62';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.mission.target) {
    const target = mapPoint(world, world.mission.target.x, world.mission.target.y, scale, cx, cy);
    const clampedX = Math.max(x + 10, Math.min(x + size - 10, target.x));
    const clampedY = Math.max(y + 10, Math.min(y + size - 10, target.y));
    ctx.save();
    ctx.translate(clampedX, clampedY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = SOLARA.accent;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(world.player.angle + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(8, 9);
  ctx.lineTo(0, 5);
  ctx.lineTo(-8, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,209,102,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 16);
  ctx.stroke();
  ctx.fillStyle = SOLARA.accent;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(world.area.toUpperCase(), x + 4, y - 6);
}

export function drawTitle() {}
