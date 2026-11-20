import { COLORS, FONT, GRID, VIEW, WORLD } from './config.js';
import { activityMarkers } from './activities.js';

const SIZE = 204;
const LEFT = VIEW.width - SIZE - 18;
const TOP = 18;
const SCALE = 0.076;

function project(x, y, centerX, centerY) {
  return {
    x: SIZE / 2 + (x - centerX) * SCALE,
    y: SIZE / 2 + (y - centerY) * SCALE,
  };
}

function marker(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,25,28,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawBase(ctx, world, centerX, centerY) {
  ctx.fillStyle = '#7fa98f';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const water = project(0, WORLD.waterY, centerX, centerY);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(0, water.y, SIZE, SIZE - water.y);
  const beach = project(0, WORLD.beachY, centerX, centerY);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(0, beach.y, SIZE, Math.max(0, water.y - beach.y));

  ctx.fillStyle = 'rgba(58,62,70,0.82)';
  for (const block of world.city.blocks) {
    if (block.buildings.length === 0) continue;
    const at = project(block.x, block.y, centerX, centerY);
    if (at.x < -40 || at.x > SIZE + 40 || at.y < -40 || at.y > SIZE + 40) continue;
    ctx.fillRect(at.x, at.y, block.size * SCALE, block.size * SCALE);
  }

  ctx.strokeStyle = '#d9d4bd';
  ctx.lineWidth = 6;
  for (let column = 0; column < GRID.columns; column += 1) {
    const at = project(GRID.first + column * GRID.step, 0, centerX, centerY);
    if (at.x < -10 || at.x > SIZE + 10) continue;
    ctx.beginPath();
    ctx.moveTo(at.x, -10);
    ctx.lineTo(at.x, SIZE + 10);
    ctx.stroke();
  }
  for (let row = 0; row < GRID.rows; row += 1) {
    const at = project(0, GRID.first + row * GRID.step, centerX, centerY);
    if (at.y < -10 || at.y > SIZE + 10) continue;
    ctx.beginPath();
    ctx.moveTo(-10, at.y);
    ctx.lineTo(SIZE + 10, at.y);
    ctx.stroke();
  }
}

function drawVehicleDots(ctx, world, centerX, centerY) {
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    const at = project(car.x, car.y, centerX, centerY);
    if (at.x < 0 || at.x > SIZE || at.y < 0 || at.y > SIZE) continue;
    if (car.driver?.type === 'police') {
      ctx.fillStyle = world.wanted.level >= 3 ? '#ff5b53' : '#6fa8ff';
      ctx.beginPath();
      ctx.arc(at.x, at.y, 3.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (car.id === world.player.inVehicle) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(at.x, at.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBlips(ctx, world, centerX, centerY) {
  const blips = [];
  if (world.mission.blip) blips.push({ ...world.mission.blip, color: '#ffd166' });
  if (world.activity.active && world.activity.blip) {
    blips.push({ ...world.activity.blip, color: '#6de2d8' });
  }
  if (!world.mission.active && world.storyMarker) {
    blips.push({ ...world.storyMarker, color: '#ffd166' });
  }
  for (const job of activityMarkers(world)) blips.push({ ...job, color: '#8fd8a3', small: true });

  for (const blip of blips) {
    const at = project(blip.x, blip.y, centerX, centerY);
    if (at.x < 0 || at.x > SIZE || at.y < 0 || at.y > SIZE) continue;
    marker(ctx, at.x, at.y, blip.small ? 3.5 : 6, blip.color);
  }
}

function drawArrow(ctx, world, centerX, centerY) {
  const at = project(centerX, centerY, centerX, centerY);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(world.player.angle + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#25333a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawMinimap(ctx, world) {
  const centerX = world.player.x;
  const centerY = world.player.y;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(LEFT, TOP, SIZE, SIZE, 14);
  ctx.fillStyle = 'rgba(12,24,31,0.88)';
  ctx.fill();
  ctx.clip();
  ctx.translate(LEFT, TOP);

  drawBase(ctx, world, centerX, centerY);
  drawVehicleDots(ctx, world, centerX, centerY);
  drawBlips(ctx, world, centerX, centerY);
  drawArrow(ctx, world, centerX, centerY);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,238,198,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(LEFT, TOP, SIZE, SIZE, 14);
  ctx.stroke();
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = '#efe7cf';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARA BAY', LEFT + 12, TOP + 18);
}
