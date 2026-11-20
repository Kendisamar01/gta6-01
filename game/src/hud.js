import { FIELD, FONT } from './config.js';
import { weaponInfo } from './combat.js';
import { money } from './util.js';

let lastArea = '';
let areaUntil = 0;

function bar(ctx, x, y, width, height, amount, color, label) {
  ctx.fillStyle = 'rgba(13, 20, 27, 0.78)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * Math.min(1, Math.max(0, amount))), height - 4);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4f7fb';
  ctx.fillText(label, x + 6, y + height / 2 + 0.5);
}

function star(ctx, x, y, outer, inner, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function draw(ctx, state) {
  if (state.harmless) return;
  const player = state.player;
  const combat = state.systems && state.systems.combat;
  const missions = state.systems && state.systems.missions;
  const audio = state.systems && state.systems.audio;
  ctx.save();
  ctx.textBaseline = 'top';

  ctx.fillStyle = 'rgba(12, 20, 28, 0.76)';
  ctx.fillRect(14, 14, 290, 96);
  bar(ctx, 26, 26, 170, 15, player.health / 100, '#df5b51', `HEALTH ${Math.max(0, Math.round(player.health))}`);
  bar(ctx, 26, 46, 170, 13, player.armor / 100, '#5ea8d7', `ARMOR ${Math.max(0, Math.round(player.armor))}`);
  ctx.font = `700 21px ${FONT}`;
  ctx.fillStyle = '#f2c94c';
  ctx.textAlign = 'left';
  ctx.fillText(money(player.cash), 26, 67);
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = 'rgba(235, 240, 245, 0.72)';
  ctx.fillText(`RESPECT ${Math.round(state.respect || 0)}`, 152, 76);

  const stars = Math.max(0, state.wantedStars || 0);
  if (stars > 0.05) {
    ctx.fillStyle = 'rgba(14, 19, 30, 0.72)';
    ctx.fillRect(FIELD.width / 2 - 94, 14, 188, 38);
    for (let index = 0; index < 5; index += 1) {
      const filled = Math.min(1, Math.max(0, stars - index));
      star(ctx, FIELD.width / 2 - 72 + index * 36, 33, 12, 5.4, filled > 0 ? '#f3c348' : 'rgba(255, 255, 255, 0.22)');
      if (filled > 0 && filled < 1) {
        star(ctx, FIELD.width / 2 - 72 + index * 36, 33, 12 * filled, 5.4 * filled, '#fff0b0');
      }
    }
  }

  if (state.area !== lastArea) {
    lastArea = state.area;
    areaUntil = state.elapsed + 2.6;
  }
  if (areaUntil > state.elapsed) {
    const alpha = Math.min(1, (areaUntil - state.elapsed) / 0.8);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = `700 27px ${FONT}`;
    ctx.fillStyle = 'rgba(12, 20, 28, 0.62)';
    ctx.fillRect(FIELD.width / 2 - 210, 78, 420, 48);
    ctx.fillStyle = '#fff6dc';
    ctx.fillText(state.area.toUpperCase(), FIELD.width / 2, 90);
    ctx.globalAlpha = 1;
  }

  const objective = missions && missions.objective();
  if (objective) {
    const label = state.mission.active && state.mission.data
      ? `${state.mission.data.title}: ${objective.label}`
      : objective.label;
    ctx.textAlign = 'center';
    ctx.font = `600 16px ${FONT}`;
    const width = Math.min(760, Math.max(360, ctx.measureText(label).width + 44));
    ctx.fillStyle = 'rgba(12, 20, 28, 0.74)';
    ctx.fillRect(FIELD.width / 2 - width / 2, 136, width, 34);
    ctx.fillStyle = '#ffe1a0';
    ctx.fillText(label, FIELD.width / 2, 143);
  }
  if (state.side.active) {
    const activity = state.side.active;
    const detail = activity === 'rampage'
      ? `${state.side.score}/8 hits · ${Math.max(0, Math.ceil(state.side.timer))}s`
      : `${Math.max(0, Math.ceil(state.side.timer))}s left`;
    ctx.textAlign = 'center';
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = '#82e0d7';
    ctx.fillText(`${activity.toUpperCase()}  ${detail}`, FIELD.width / 2, 177);
  }

  const weapon = weaponInfo(state.weapon);
  ctx.fillStyle = 'rgba(12, 20, 28, 0.76)';
  ctx.fillRect(FIELD.width - 254, FIELD.height - 78, 238, 62);
  ctx.textAlign = 'left';
  ctx.font = `700 18px ${FONT}`;
  ctx.fillStyle = '#f4f7fb';
  ctx.fillText(weapon.label, FIELD.width - 240, FIELD.height - 68);
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = '#f2c94c';
  const ammo = state.weapon === 'fists' ? '-' : `${state.ammo}/${combat ? combat.reserveFor(state.weapon) : 0}`;
  ctx.fillText(`AMMO ${ammo}`, FIELD.width - 240, FIELD.height - 44);
  if (combat && combat.reloading()) {
    ctx.fillStyle = '#82e0d7';
    ctx.fillText('RELOADING', FIELD.width - 112, FIELD.height - 44);
  }

  ctx.textAlign = 'left';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.76)';
  ctx.fillText('WASD drive/walk  SPACE brake  E enter  F exit  R reload  1-3 weapon  M mute', 18, FIELD.height - 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.fillText(`${state.environment.state.clock}${audio && audio.isMuted() ? '  MUTED' : ''}`, FIELD.width - 18, FIELD.height - 26);

  for (let index = 0; index < state.toasts.length; index += 1) {
    const toast = state.toasts[index];
    const alpha = Math.min(1, toast.life / 0.7);
    ctx.globalAlpha = alpha;
    ctx.font = `600 14px ${FONT}`;
    const width = Math.min(360, ctx.measureText(toast.message).width + 28);
    const y = 212 + index * 34;
    ctx.fillStyle = 'rgba(12, 20, 28, 0.78)';
    ctx.fillRect(FIELD.width - width - 18, y, width, 28);
    ctx.fillStyle = '#f3dcae';
    ctx.textAlign = 'right';
    ctx.fillText(toast.message, FIELD.width - 32, y + 6);
    ctx.globalAlpha = 1;
  }

  if (state.dialogue) {
    const lines = String(state.dialogue.text).split('\n');
    const panelHeight = 52 + lines.length * 21;
    const y = FIELD.height - panelHeight - 92;
    ctx.fillStyle = 'rgba(10, 18, 27, 0.9)';
    ctx.fillRect(FIELD.width / 2 - 360, y, 720, panelHeight);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(FIELD.width / 2 - 360, y, 5, panelHeight);
    ctx.textAlign = 'left';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillStyle = '#f2c94c';
    ctx.fillText(state.dialogue.speaker.toUpperCase(), FIELD.width / 2 - 338, y + 12);
    ctx.font = `500 16px ${FONT}`;
    ctx.fillStyle = '#eef1f5';
    for (let index = 0; index < lines.length; index += 1) {
      ctx.fillText(lines[index], FIELD.width / 2 - 338, y + 38 + index * 21);
    }
  }

  if (player.health < 34) {
    const pulse = 0.2 + 0.12 * Math.sin(state.elapsed * 6);
    ctx.fillStyle = `rgba(180, 30, 32, ${Math.max(0, pulse).toFixed(3)})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  if (state.busted || state.wasted) {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.font = `800 58px ${FONT}`;
    ctx.fillStyle = '#f4f7fb';
    ctx.fillText(state.busted ? 'BUSTED' : 'WASTED', FIELD.width / 2, FIELD.height / 2 - 30);
    ctx.font = `600 18px ${FONT}`;
    ctx.fillStyle = '#f2c94c';
    ctx.fillText('Respawning in Solara Bay...', FIELD.width / 2, FIELD.height / 2 + 34);
  }

  ctx.restore();
}
