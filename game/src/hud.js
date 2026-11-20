import { FIELD, SOLARA } from './config.js';
import { formatClock } from './world.js';
import { SCREENS } from './config.js';

function bar(ctx, x, y, w, h, value, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, value)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = SOLARA.text;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 5);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,24,34,0.78)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.28)';
  ctx.stroke();
}

function drawStars(ctx, world) {
  const stars = world.wanted;
  const x = FIELD.width / 2 - 88;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '26px system-ui, sans-serif';
  for (let i = 0; i < 5; i += 1) {
    const active = i < stars;
    ctx.fillStyle = active ? SOLARA.accent : 'rgba(255,255,255,0.18)';
    ctx.fillText('★', x + i * 44, 38);
  }
  if (stars > 0) {
    ctx.fillStyle = SOLARA.danger;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('WANTED', FIELD.width / 2, 62);
  }
}

function drawNotices(ctx, world) {
  let y = 142;
  for (const notice of world.notices) {
    const alpha = Math.min(1, notice.life * 1.5);
    ctx.globalAlpha = alpha;
    const width = Math.max(180, Math.min(420, notice.text.length * 10 + 32));
    panel(ctx, 20, y, width, 34);
    ctx.fillStyle = notice.kind === 'warn' ? SOLARA.danger : notice.kind === 'good' ? SOLARA.money : notice.kind === 'mission' ? SOLARA.accent : SOLARA.text;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(notice.text, 34, y + 17);
    ctx.globalAlpha = 1;
    y += 42;
  }
}

function drawDialogue(ctx, world) {
  const dialogue = world.mission.dialogue;
  if (!dialogue) return;
  panel(ctx, 236, 520, 808, 126);
  ctx.fillStyle = SOLARA.accent;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(world.mission.active?.giver?.toUpperCase() || 'RADIO', 262, 540);
  ctx.fillStyle = SOLARA.text;
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText(dialogue.lines[dialogue.line] || '', 262, 568);
  ctx.fillStyle = SOLARA.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ENTER TO CONTINUE', 1020, 624);
}

function drawObjective(ctx, world) {
  const text = world.mission.text || '';
  if (!text) return;
  const width = Math.min(640, Math.max(300, text.length * 9 + 40));
  panel(ctx, FIELD.width / 2 - width / 2, 78, width, 42);
  ctx.fillStyle = SOLARA.accent;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, FIELD.width / 2, 99);
  if (world.mission.active?.seconds && world.mission.stage === 0) {
    ctx.fillStyle = world.mission.timer < 20 ? SOLARA.danger : SOLARA.text;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`${Math.max(0, Math.ceil(world.mission.timer))}s`, FIELD.width / 2, 136);
  }
}

export function draw(ctx, world, api) {
  if (world.screen === SCREENS.title) return;
  const player = world.player;
  panel(ctx, 18, 18, 274, 112);
  bar(ctx, 34, 52, 150, 11, player.health / 100, SOLARA.danger, 'HEALTH');
  bar(ctx, 34, 88, 150, 9, player.armor / 100, SOLARA.police, 'ARMOUR');
  ctx.fillStyle = SOLARA.money;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`$${player.money}`, 274, 58);
  ctx.fillStyle = SOLARA.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`RESPECT ${player.respect}`, 274, 86);
  ctx.fillStyle = SOLARA.accent;
  ctx.textAlign = 'left';
  ctx.fillText(formatClock(world), 34, 116);

  drawStars(ctx, world);
  drawObjective(ctx, world);

  panel(ctx, 18, 626, 320, 76);
  ctx.fillStyle = SOLARA.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(player.weapon.toUpperCase(), 34, 650);
  ctx.fillStyle = player.ammo === 0 ? SOLARA.danger : SOLARA.accent;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`${player.ammo} / ${player.reserve}`, 34, 680);
  if (player.reload > 0) {
    ctx.fillStyle = SOLARA.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('RELOADING', 164, 680);
  }

  if (player.inVehicle !== null) {
    const car = world.vehicles.find((item) => item.id === player.inVehicle);
    if (car) {
      panel(ctx, 452, 632, 208, 68);
      ctx.fillStyle = SOLARA.text;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(Math.abs(car.speed) * 0.75)} km/h`, 556, 666);
      ctx.fillStyle = car.damage > 70 ? SOLARA.danger : SOLARA.muted;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(`${car.type.toUpperCase()}   DMG ${Math.round(car.damage)}%`, 556, 690);
    }
  }

  if (world.side.rampage > 0) {
    panel(ctx, FIELD.width / 2 - 130, 146, 260, 40);
    ctx.fillStyle = SOLARA.danger;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`RAMPAGE ${Math.ceil(world.side.rampage)}s`, FIELD.width / 2, 166);
  }
  if (world.mission.failed) {
    ctx.fillStyle = SOLARA.danger;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ENTER TO RETRY', FIELD.width / 2, 250);
  }
  drawDialogue(ctx, world);
  drawNotices(ctx, world);

  if (api?.input) {
    const { x, y } = api.input.mouse;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 14);
    ctx.stroke();
  }
}

export function stageShot(name, api) {
  const world = api.world;
  if (name === 'mission') world.notices.push({ text: 'Ambush! Return fire.', kind: 'warn', life: 9, max: 9 });
  if (name === 'chase') world.notices.push({ text: '3 stars — patrol units inbound', kind: 'warn', life: 9, max: 9 });
  if (name === 'drive') world.notices.push({ text: 'Borrowed Wheels: deliver the van', kind: 'mission', life: 9, max: 9 });
}
