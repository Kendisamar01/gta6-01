import { COLORS, FIELD, FONT } from './config.js';
import { cellAt } from './city.js';

const SIZE = 196;
const X = FIELD.width - SIZE - 24;
const Y = 96;
const RANGE = 460;

function polygon(context, x, y, points, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + points[0][0], y + points[0][1]);
  for (let index = 1; index < points.length; index += 1) context.lineTo(x + points[index][0], y + points[index][1]);
  context.closePath();
  context.fill();
}

export function createMinimap(world) {
  const state = world.state;

  function draw(context, view) {
    const player = state.player;
    const scale = SIZE / (RANGE * 2);
    const toX = (x) => X + SIZE / 2 + (x - player.x) * scale;
    const toY = (y) => Y + SIZE / 2 + (y - player.y) * scale;

    context.save();
    context.fillStyle = 'rgba(12, 22, 34, 0.82)';
    context.fillRect(X - 5, Y - 5, SIZE + 10, SIZE + 10);
    context.strokeStyle = 'rgba(238, 214, 150, 0.75)';
    context.lineWidth = 2;
    context.strokeRect(X - 5, Y - 5, SIZE + 10, SIZE + 10);
    context.beginPath();
    context.rect(X, Y, SIZE, SIZE);
    context.clip();

    const cellSize = world.city.cellSize;
    const left = player.x - RANGE;
    const right = player.x + RANGE;
    const top = player.y - RANGE;
    const bottom = player.y + RANGE;
    const firstColumn = Math.max(0, Math.floor(left / cellSize));
    const lastColumn = Math.min(world.city.grid - 1, Math.floor(right / cellSize));
    const firstRow = Math.max(0, Math.floor(top / cellSize));
    const lastRow = Math.min(world.city.grid - 1, Math.floor(bottom / cellSize));

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const cell = cellAt(world.city, (column + 0.5) * cellSize, (row + 0.5) * cellSize);
        if (!cell) continue;
        const color = cell.terrain === 'water' ? '#2c7f9d' : cell.terrain === 'sand' ? '#d7c18d' : cell.park ? '#5f9a58' : '#7d9872';
        context.fillStyle = color;
        context.fillRect(toX(column * cellSize), toY(row * cellSize), cellSize * scale + 1, cellSize * scale + 1);
        if (cell.terrain !== 'water') {
          context.fillStyle = '#4b5057';
          context.fillRect(toX(column * cellSize), toY(row * cellSize), world.city.road * scale + 1, cellSize * scale + 1);
          context.fillRect(toX(column * cellSize), toY(row * cellSize), cellSize * scale + 1, world.city.road * scale + 1);
        }
      }
    }

    const vehicles = Array.isArray(state.vehicles) ? state.vehicles : [];
    for (let index = 0; index < vehicles.length; index += 1) {
      const vehicle = vehicles[index];
      if (vehicle.wrecked) continue;
      context.fillStyle = vehicle.siren ? '#6fb7ff' : '#e9e4d4';
      context.fillRect(toX(vehicle.x) - 1.5, toY(vehicle.y) - 1.5, 3, 3);
    }
    const peds = Array.isArray(state.peds) ? state.peds : [];
    for (let index = 0; index < peds.length; index += 1) {
      const ped = peds[index];
      if (ped.role !== 'police' || ped.dead) continue;
      context.fillStyle = '#5599ff';
      context.beginPath();
      context.arc(toX(ped.x), toY(ped.y), 2.6, 0, Math.PI * 2);
      context.fill();
    }

    const marker = state.mission && state.mission.marker;
    if (marker) {
      const mx = toX(marker.x);
      const my = toY(marker.y);
      polygon(context, mx, my, [[0, -7], [7, 0], [0, 7], [-7, 0]], '#ffd25e');
      context.strokeStyle = 'rgba(90, 58, 20, 0.8)';
      context.lineWidth = 1;
      context.stroke();
    }

    const px = X + SIZE / 2;
    const py = Y + SIZE / 2;
    context.save();
    context.translate(px, py);
    context.rotate(player.angle + Math.PI / 2);
    polygon(context, 0, 0, [[0, -8], [6, 7], [0, 3], [-6, 7]], '#fff3d0');
    context.restore();
    context.restore();

    context.font = `11px ${FONT}`;
    context.fillStyle = '#fff0cf';
    context.textAlign = 'left';
    context.fillText('N', X + SIZE / 2 - 4, Y + 13);
    context.textAlign = 'right';
    context.fillText(state.area.toUpperCase(), X + SIZE, Y + SIZE + 19);
  }

  return { draw };
}

let current = null;

export function install(context) {
  current = createMinimap(context.world);
  context.systems.minimap = current;
}
