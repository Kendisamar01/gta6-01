import { FIELD, FONT } from './config.js';
import { clamp, distance } from './util.js';

const SIZE = 182;
const X = FIELD.width - SIZE - 18;
const Y = 18;
const HALF = SIZE / 2;

function roundPanel(ctx) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(X, Y, SIZE, SIZE, 12);
  else ctx.rect(X, Y, SIZE, SIZE);
}

export function draw(ctx, state) {
  const city = state.city;
  const player = state.player;
  const center = player.inVehicle && state.systems.vehicles.playerVehicle()
    ? state.systems.vehicles.playerVehicle()
    : player;
  const scale = 0.17;
  const point = (x, y) => ({
    x: X + HALF + (x - center.x) * scale,
    y: Y + HALF + (y - center.y) * scale,
  });

  ctx.save();
  roundPanel(ctx);
  ctx.fillStyle = 'rgba(15, 24, 31, 0.9)';
  ctx.fill();
  ctx.clip();

  ctx.fillStyle = '#77996b';
  ctx.fillRect(X, Y, SIZE, SIZE);
  const shore = point(0, city.shoreY);
  ctx.fillStyle = '#276f8e';
  ctx.fillRect(X, shore.y, SIZE, SIZE - shore.y + 10);
  ctx.fillStyle = '#d7cba4';
  ctx.fillRect(X, shore.y - 5, SIZE, 5);

  const firstCol = Math.max(0, Math.floor((center.x - 550) / city.cell));
  const lastCol = Math.min(city.cols, Math.ceil((center.x + 550) / city.cell));
  const firstRow = Math.max(0, Math.floor((center.y - 550) / city.cell));
  const lastRow = Math.min(city.rows, Math.ceil((center.y + 550) / city.cell));

  ctx.strokeStyle = '#434a52';
  ctx.lineWidth = city.road * scale;
  for (let col = firstCol; col <= lastCol; col += 1) {
    const a = point(col * city.cell, 0);
    const b = point(col * city.cell, city.shoreY);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let row = firstRow; row <= lastRow; row += 1) {
    const a = point(0, row * city.cell);
    const b = point(city.width, row * city.cell);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(244, 232, 184, 0.65)';
  ctx.lineWidth = 1;
  for (let col = firstCol; col <= lastCol; col += 1) {
    const a = point(col * city.cell, 0);
    const b = point(col * city.cell, city.shoreY);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  const objective = state.systems.missions.objective();
  if (objective) {
    const at = point(objective.x, objective.y);
    const far = distance(at.x, at.y, X + HALF, Y + HALF) > HALF - 14;
    const dx = at.x - (X + HALF);
    const dy = at.y - (Y + HALF);
    const length = Math.max(1, Math.hypot(dx, dy));
    const px = far ? X + HALF + dx / length * (HALF - 16) : at.x;
    const py = far ? Y + HALF + dy / length * (HALF - 16) : at.y;
    ctx.fillStyle = '#ffd15c';
    ctx.beginPath();
    ctx.moveTo(px, py - 8);
    ctx.lineTo(px + 8, py);
    ctx.lineTo(px, py + 8);
    ctx.lineTo(px - 8, py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5a431a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const unit of state.systems.police.units) {
    if (unit.vehicle.dead) continue;
    const at = point(unit.vehicle.x, unit.vehicle.y);
    ctx.fillStyle = Math.floor(state.elapsed * 5) % 2 === 0 ? '#6aabff' : '#e05a5a';
    ctx.beginPath();
    ctx.arc(at.x, at.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(X + HALF, Y + HALF);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#f4f7fb';
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -6);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  roundPanel(ctx);
  ctx.stroke();
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText('SOLARA BAY', X + 10, Y + SIZE - 18);
  ctx.textAlign = 'right';
  ctx.fillText(clamp(Math.round(center.x / 10), 0, 9999) + ' E', X + SIZE - 10, Y + SIZE - 18);
}
