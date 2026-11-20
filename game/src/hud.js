import { FONT, SCREEN } from './config.js';
import { sideObjective } from './activities.js';
import { storyObjective, storyTitle } from './missions.js';
import { CAST } from './story.js';

function text(ctx, value, x, y, size, shade, align = 'left', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillStyle = shade;
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, wide, tall, fill = 'rgba(15,27,35,0.8)', edge = 'rgba(255,228,174,0.26)') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, wide, tall, 11);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function gauge(ctx, x, y, wide, amount, shade, caption) {
  const filled = Math.max(0, Math.min(1, amount));
  panel(ctx, x, y, wide, 21, 'rgba(9,17,23,0.82)', 'rgba(255,255,255,0.12)');
  if (filled > 0) {
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, (wide - 4) * filled, 17, 5);
    ctx.fill();
  }
  text(ctx, caption, x + 8, y + 15, 11, '#fff6e3', 'left', '800');
}

function star(ctx, x, y, radius, lit) {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const reach = point % 2 === 0 ? radius : radius * 0.43;
    const px = x + Math.cos(angle) * reach;
    const py = y + Math.sin(angle) * reach;
    if (point === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = lit ? '#ffd166' : 'rgba(255,255,255,0.2)';
  ctx.fill();
  if (lit) {
    ctx.strokeStyle = 'rgba(96,50,20,0.7)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function vitals(ctx, world) {
  panel(ctx, 18, 16, 286, 76);
  gauge(ctx, 30, 27, 262, world.player.hp / 100, '#e45e53', 'HEALTH');
  gauge(ctx, 30, 54, 262, world.player.armor / 100, '#5bb9d9', 'ARMOR');
  text(ctx, `$${world.player.money}`, 30, 122, 24, '#ffd977', 'left', '800');
  text(ctx, `RESPECT ${world.player.respect}`, 288, 121, 13, '#d8e5e6', 'right');
}

function heatPanel(ctx, world) {
  if (world.wanted.stars === 0 && world.wanted.alert <= 0) return;
  panel(ctx, 500, 16, 280, 52, 'rgba(15,27,35,0.72)');
  for (let i = 0; i < 5; i += 1) star(ctx, 533 + i * 43, 43, 15, i < world.wanted.stars);
  if (world.wanted.alert > 0) {
    ctx.save();
    ctx.globalAlpha = world.wanted.alert * 0.45;
    text(ctx, 'WANTED', 640, 82, 13, '#ffdd8a', 'center', '800');
    ctx.restore();
  }
}

function equipment(ctx, world) {
  panel(ctx, 18, 614, 252, 84);
  const car = world.player.carId === null
    ? null
    : world.vehicles.find((unit) => unit.id === world.player.carId) ?? null;
  if (car) {
    text(ctx, 'DRIVING', 32, 646, 20, '#f5f2e6', 'left', '800');
    text(ctx, `${Math.round(Math.abs(car.velocity))} km/h`, 256, 646, 21, '#ffd977', 'right', '800');
    text(ctx, 'Space handbrake · H horn · E exit', 32, 674, 12, '#b9c6c6', 'left', '600');
    return;
  }
  const armed = world.player.weapon === 'pistol';
  text(ctx, armed ? 'PISTOL' : 'FISTS', 32, 646, 20, '#f5f2e6', 'left', '800');
  if (armed) {
    text(ctx, `${world.player.ammo} / ${world.player.reserve}`, 256, 646, 22,
      world.player.ammo === 0 ? '#ef6a5c' : '#ffd977', 'right', '800');
    text(ctx, world.player.reloadClock > 0 ? 'RELOADING...' : 'R reload · 2 pistol · 1 fists',
      32, 674, 12, '#b9c6c6', 'left', '600');
  } else {
    text(ctx, 'E jack · Shift run', 32, 674, 12, '#b9c6c6', 'left', '600');
  }
}

function objective(ctx, world) {
  const jobActive = world.activity.active;
  const missionActive = world.mission.active || world.mission.failed;
  if (!jobActive && !missionActive) return;
  const heading = jobActive
    ? world.activity.kind.toUpperCase()
    : `MISSION ${world.mission.id + 1} — ${storyTitle(world)}`;
  const body = jobActive ? sideObjective(world) : storyObjective(world);
  ctx.font = `600 17px ${FONT}`;
  const wide = Math.min(760, Math.max(430, ctx.measureText(body).width + 56));
  const x = (SCREEN.width - wide) / 2;
  panel(ctx, x, 604, wide, 94, 'rgba(13,24,30,0.88)');
  text(ctx, heading, x + 22, 630, 12, '#ffcf70', 'left', '800');
  text(ctx, body, x + 22, 660, 18, '#f3f5ee', 'left');
  if (world.mission.failed) {
    text(ctx, 'Enter to retry', x + wide - 22, 686, 12, '#ef7c6d', 'right');
  }
}

function notices(ctx, world) {
  for (let i = 0; i < world.toasts.length; i += 1) {
    const note = world.toasts[i];
    ctx.save();
    ctx.globalAlpha = Math.min(1, note.life / 0.6);
    panel(ctx, 20, 150 + i * 38, note.width, 32, 'rgba(14,25,33,0.84)');
    text(ctx, note.text, 34, 172 + i * 38, 15, '#f6efdc', 'left');
    ctx.restore();
  }
}

function districtTag(ctx, world) {
  if (world.area.life <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, world.area.life * 1.5);
  text(ctx, world.area.name.toUpperCase(), 1000, 110, 18, '#fff2cc', 'right', '800');
  text(ctx, world.area.street.toUpperCase(), 1000, 132, 12, '#d6dfd9', 'right', '600');
  ctx.restore();
}

function wrapText(ctx, value, x, y, maxWide, lineHeight, maxLines) {
  const words = value.split(' ');
  let line = '';
  let row = 0;
  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(candidate).width <= maxWide || line === '') {
      line = candidate;
      continue;
    }
    ctx.fillText(line, x, y + row * lineHeight);
    row += 1;
    line = word;
    if (row >= maxLines) return;
  }
  ctx.fillText(line, x, y + row * lineHeight);
}

function conversation(ctx, world) {
  if (!world.dialogue) return;
  const line = world.dialogue.lines[world.dialogue.line];
  if (!line) return;
  const actor = CAST[line.speaker] ?? { name: line.speaker, role: '', shade: '#ffd977' };
  panel(ctx, 150, 430, 980, 152, 'rgba(11,21,29,0.95)', 'rgba(255,215,145,0.42)');
  ctx.fillStyle = actor.shade;
  ctx.fillRect(150, 430, 6, 152);
  text(ctx, actor.name, 180, 470, 17, actor.shade, 'left', '800');
  text(ctx, actor.role ?? '', 1110, 470, 12, '#9fb2b7', 'right', '600');
  ctx.font = `500 22px ${FONT}`;
  ctx.fillStyle = '#f7f4e9';
  ctx.textAlign = 'left';
  wrapText(ctx, line.text, 180, 506, 920, 30, 3);
  text(ctx, `Enter ${world.dialogue.line + 1}/${world.dialogue.lines.length}`,
    1110, 562, 12, '#c8d3d1', 'right');
}

export function drawHUD(ctx, world) {
  vitals(ctx, world);
  heatPanel(ctx, world);
  equipment(ctx, world);
  objective(ctx, world);
  notices(ctx, world);
  districtTag(ctx, world);
  conversation(ctx, world);
}
