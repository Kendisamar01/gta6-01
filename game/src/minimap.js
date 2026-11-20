import { FONT, MAP, PALETTE, SCREEN } from './config.js';
import { sideMarkers } from './activities.js';

const WIDTH = 202;
const LEFT = SCREEN.width - WIDTH - 20;
const TOP = 18;
const ZOOM = 0.076;

function locate(x, y, centerX, centerY) {
  return {
    x: WIDTH / 2 + (x - centerX) * ZOOM,
    y: WIDTH / 2 + (y - centerY) * ZOOM,
  };
}

function diamond(ctx, x, y, reach, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - reach);
  ctx.lineTo(x + reach, y);
  ctx.lineTo(x, y + reach);
  ctx.lineTo(x - reach, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(18,28,34,0.85)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function backdrop(ctx, world, centerX, centerY) {
  ctx.fillStyle = '#7f9e70';
  ctx.fillRect(0, 0, WIDTH, WIDTH);

  const shore = locate(0, MAP.sandLine, centerX, centerY);
  const ocean = locate(0, MAP.seaLine, centerX, centerY);
  ctx.fillStyle = PALETTE.sandShade;
  ctx.fillRect(0, shore.y, WIDTH, Math.max(0, ocean.y - shore.y));
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(0, ocean.y, WIDTH, WIDTH - ocean.y);

  ctx.fillStyle = 'rgba(52,62,68,0.86)';
  for (const plot of world.city.plots) {
    if (plot.structures.length === 0) continue;
    const at = locate(plot.cx, plot.cy, centerX, centerY);
    if (at.x < -30 || at.x > WIDTH + 30 || at.y < -30 || at.y > WIDTH + 30) continue;
    ctx.fillRect(at.x, at.y, plot.size * ZOOM, plot.size * ZOOM);
  }

  ctx.strokeStyle = '#ded9c4';
  ctx.lineWidth = 5;
  for (let column = 0; column < MAP.columns; column += 1) {
    const at = locate(MAP.first + column * MAP.step, 0, centerX, centerY);
    if (at.x < -8 || at.x > WIDTH + 8) continue;
    ctx.beginPath();
    ctx.moveTo(at.x, -8);
    ctx.lineTo(at.x, WIDTH + 8);
    ctx.stroke();
  }
  for (let row = 0; row < MAP.rows; row += 1) {
    const at = locate(0, MAP.first + row * MAP.step, centerX, centerY);
    if (at.y < -8 || at.y > WIDTH + 8) continue;
    ctx.beginPath();
    ctx.moveTo(-8, at.y);
    ctx.lineTo(WIDTH + 8, at.y);
    ctx.stroke();
  }
}

function dots(ctx, world, centerX, centerY) {
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    const at = locate(car.x, car.y, centerX, centerY);
    if (at.x < 0 || at.x > WIDTH || at.y < 0 || at.y > WIDTH) continue;
    if (car.id === world.player.carId) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(at.x, at.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (car.driver?.type === 'officer') {
      ctx.fillStyle = world.wanted.stars >= 3 ? '#ff6258' : '#74a8ff';
      ctx.beginPath();
      ctx.arc(at.x, at.y, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function pins(ctx, world, centerX, centerY) {
  const marks = [];
  if (world.storyPin) marks.push({ ...world.storyPin, color: '#ffd166' });
  if (world.mission.pin) marks.push({ ...world.mission.pin, color: '#ffb454' });
  if (world.activity.pin) marks.push({ ...world.activity.pin, color: '#67e2d9' });
  for (const job of sideMarkers(world)) marks.push({ ...job, color: '#8fd79b', tiny: true });

  for (const mark of marks) {
    const at = locate(mark.x, mark.y, centerX, centerY);
    if (at.x < 0 || at.x > WIDTH || at.y < 0 || at.y > WIDTH) continue;
    diamond(ctx, at.x, at.y, mark.tiny ? 3.6 : 6, mark.color);
  }
}

function arrow(ctx, centerX, centerY, angle) {
  const at = locate(centerX, centerY, centerX, centerY);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#25333a';
  ctx.lineWidth = 1.8;
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
  ctx.roundRect(LEFT, TOP, WIDTH, WIDTH, 14);
  ctx.fillStyle = 'rgba(12,24,31,0.9)';
  ctx.fill();
  ctx.clip();
  ctx.translate(LEFT, TOP);
  backdrop(ctx, world, centerX, centerY);
  dots(ctx, world, centerX, centerY);
  pins(ctx, world, centerX, centerY);
  arrow(ctx, centerX, centerY, world.player.angle);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,238,198,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(LEFT, TOP, WIDTH, WIDTH, 14);
  ctx.stroke();
  ctx.font = `800 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#efe7cf';
  ctx.fillText('SOLARA BAY', LEFT + 12, TOP + 18);
}
