import { FONT, VIEW } from './config.js';
import { activityObjective } from './activities.js';
import { missionObjective, missionTitle } from './missions.js';
import { CHARACTERS } from './story.js';

function label(ctx, value, x, y, size, color, align = 'left', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function card(ctx, x, y, width, height, fill, stroke) {
  ctx.fillStyle = fill ?? 'rgba(15,27,35,0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 11);
  ctx.fill();
  ctx.strokeStyle = stroke ?? 'rgba(255,228,174,0.26)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function meter(ctx, x, y, width, amount, color, name) {
  const fill = Math.max(0, Math.min(1, amount));
  card(ctx, x, y, width, 21, 'rgba(9,17,23,0.82)', 'rgba(255,255,255,0.12)');
  if (fill > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, (width - 4) * fill, 17, 5);
    ctx.fill();
  }
  label(ctx, name, x + 8, y + 15, 11, '#fff6e3', 'left', '800');
}

function starGlyph(ctx, x, y, radius, lit) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const distance = i % 2 === 0 ? radius : radius * 0.43;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    if (i === 0) ctx.moveTo(px, py);
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

function drawVitals(ctx, world) {
  card(ctx, 18, 16, 286, 76);
  meter(ctx, 30, 27, 262, world.player.hp / 100, '#e45e53', 'HEALTH');
  meter(ctx, 30, 54, 262, world.player.armor / 100, '#5bb9d9', 'ARMOR');
  label(ctx, `$${world.player.money}`, 30, 122, 24, '#ffd977', 'left', '800');
  label(ctx, `RESPECT ${world.player.respect}`, 288, 121, 13, '#d8e5e6', 'right', '700');
}

function drawWanted(ctx, world) {
  if (world.wanted.level === 0 && world.wanted.flash <= 0) return;
  card(ctx, 500, 16, 280, 52, 'rgba(15,27,35,0.72)');
  for (let i = 0; i < 5; i += 1) starGlyph(ctx, 533 + i * 43, 43, 15, i < world.wanted.level);
  if (world.wanted.flash > 0) {
    ctx.save();
    ctx.globalAlpha = world.wanted.flash * 0.45;
    label(ctx, 'WANTED', 640, 82, 13, '#ffdd8a', 'center', '800');
    ctx.restore();
  }
}

function drawWeapon(ctx, world) {
  card(ctx, 18, 614, 252, 84);
  const car = world.player.inVehicle === null
    ? null
    : world.vehicles.find((vehicle) => vehicle.id === world.player.inVehicle);
  if (car !== undefined && car !== null) {
    label(ctx, 'DRIVING', 32, 646, 20, '#f5f2e6', 'left', '800');
    label(ctx, `${Math.round(Math.abs(car.speed))} km/h`, 256, 646, 21, '#ffd977', 'right', '800');
    label(ctx, 'Space handbrake · H horn · E exit', 32, 674, 12, '#b9c6c6', 'left', '600');
    return;
  }
  const pistol = world.player.weapon === 'pistol';
  label(ctx, pistol ? 'PISTOL' : 'FISTS', 32, 646, 20, '#f5f2e6', 'left', '800');
  if (pistol) {
    label(ctx, `${world.player.ammo} / ${world.player.reserve}`, 256, 646, 22,
      world.player.ammo === 0 ? '#ef6a5c' : '#ffd977', 'right', '800');
    label(ctx, world.player.reloading > 0 ? 'RELOADING...' : 'R reload · 2 pistol · 1 fists',
      32, 674, 12, '#b9c6c6', 'left', '600');
  } else {
    label(ctx, 'E jack · Shift run', 32, 674, 12, '#b9c6c6', 'left', '600');
  }
}

function drawObjective(ctx, world) {
  const missionActive = world.mission.active || world.mission.failed;
  const jobActive = world.activity.active;
  if (!missionActive && !jobActive) return;
  const heading = jobActive
    ? world.activity.kind.toUpperCase()
    : `MISSION ${world.mission.id + 1} — ${missionTitle(world)}`;
  const body = jobActive ? activityObjective(world) : missionObjective(world);
  ctx.font = `600 17px ${FONT}`;
  const width = Math.min(760, Math.max(430, ctx.measureText(body).width + 56));
  const x = (VIEW.width - width) / 2;
  card(ctx, x, 604, width, 94, 'rgba(13,24,30,0.88)');
  label(ctx, heading, x + 22, 630, 12, '#ffcf70', 'left', '800');
  label(ctx, body, x + 22, 660, 18, '#f3f5ee', 'left', '700');
  if (world.mission.failed) {
    label(ctx, 'Enter to retry', x + width - 22, 686, 12, '#ef7c6d', 'right', '700');
  }
}

function drawToasts(ctx, world) {
  for (let i = 0; i < world.toasts.length; i += 1) {
    const toast = world.toasts[i];
    ctx.save();
    ctx.globalAlpha = Math.min(1, toast.life / 0.6);
    const width = Math.max(240, toast.width ?? 260);
    card(ctx, 20, 150 + i * 38, width, 32, 'rgba(14,25,33,0.84)');
    label(ctx, toast.text, 34, 172 + i * 38, 15, '#f6efdc', 'left', '700');
    ctx.restore();
  }
}

function drawArea(ctx, world) {
  if (world.area.life <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, world.area.life * 1.5);
  label(ctx, world.area.name.toUpperCase(), 1000, 110, 18, '#fff2cc', 'right', '800');
  label(ctx, world.area.street.toUpperCase(), 1000, 132, 12, '#d6dfd9', 'right', '600');
  ctx.restore();
}

function wrap(ctx, value, x, y, maxWidth, lineHeight, maxLines) {
  const words = value.split(' ');
  let current = '';
  let row = 0;
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth || current === '') {
      current = candidate;
      continue;
    }
    ctx.fillText(current, x, y + row * lineHeight);
    row += 1;
    current = word;
    if (row >= maxLines) return;
  }
  ctx.fillText(current, x, y + row * lineHeight);
}

function drawDialogue(ctx, world) {
  if (!world.dialogue) return;
  const dialogue = world.dialogue;
  const line = dialogue.lines[dialogue.index];
  if (!line) return;
  const character = CHARACTERS[line.speaker] ?? { name: line.speaker, color: '#ffd977' };
  card(ctx, 150, 430, 980, 152, 'rgba(11,21,29,0.95)', 'rgba(255,215,145,0.42)');
  ctx.fillStyle = character.color;
  ctx.fillRect(150, 430, 6, 152);
  label(ctx, character.name, 180, 470, 17, character.color, 'left', '800');
  label(ctx, character.role ?? '', 1110, 470, 12, '#9fb2b7', 'right', '600');
  ctx.font = `500 22px ${FONT}`;
  ctx.fillStyle = '#f7f4e9';
  ctx.textAlign = 'left';
  wrap(ctx, line.text, 180, 506, 920, 30, 3);
  label(ctx, `Enter ${dialogue.index + 1}/${dialogue.lines.length}`, 1110, 562, 12, '#c8d3d1', 'right', '700');
}

export function drawHUD(ctx, world) {
  drawVitals(ctx, world);
  drawWanted(ctx, world);
  drawWeapon(ctx, world);
  drawObjective(ctx, world);
  drawToasts(ctx, world);
  drawArea(ctx, world);
  drawDialogue(ctx, world);
}
