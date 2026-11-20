import { FONT, PALETTE, VIEW, WEAPONS } from './config.js';

export function createHud(world, minimap, audio) {
  function label(context, value, x, y, size, color, align = 'left', weight = '') {
    context.font = `${weight} ${size}px ${FONT}`.trim();
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function meter(context, x, y, width, height, value, maximum, color, caption) {
    context.fillStyle = 'rgba(8,18,28,0.82)';
    context.fillRect(x, y, width, height);
    context.fillStyle = color;
    context.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * Math.min(1, value / maximum)), height - 4);
    context.strokeStyle = 'rgba(255,255,255,0.25)';
    context.lineWidth = 1;
    context.strokeRect(x, y, width, height);
    label(context, caption, x, y - 5, 12, PALETTE.muted);
  }

  function stars(context, state) {
    const count = state.wanted;
    const x = VIEW.width / 2;
    label(context, 'WANTED', x, 26, 13, PALETTE.muted, 'center', 'bold');
    for (let index = 0; index < 5; index += 1) {
      const filled = index < count;
      context.save();
      context.translate(x - 66 + index * 27, 48);
      context.fillStyle = filled ? PALETTE.accent : 'rgba(20,32,44,0.75)';
      context.strokeStyle = filled ? '#fff0c2' : 'rgba(255,255,255,0.25)';
      context.lineWidth = 1.5;
      context.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? 11 : 5;
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    }
    if (count > 0 && state.wantedProgress > 0) {
      context.fillStyle = '#6dd49a';
      context.fillRect(x - 66, 64, 132 * state.wantedProgress, 3);
    }
  }

  function objective(context, state) {
    const mission = state.mission;
    const side = state.sideActivity;
    if (!mission && !side) return;
    const text = state.objective || (mission ? mission.title : '');
    context.font = `15px ${FONT}`;
    const width = Math.min(520, Math.max(260, context.measureText(text).width + 44));
    context.fillStyle = 'rgba(8,18,28,0.8)';
    context.fillRect(24, 96, width, 62);
    context.fillStyle = PALETTE.accent;
    context.fillRect(24, 96, 4, 62);
    label(context, mission ? `JOB ${mission.index + 1}/8` : 'SIDE ACTIVITY', 38, 117, 11, PALETTE.muted, 'left', 'bold');
    label(context, text, 38, 140, 15, PALETTE.text);
    const timer = mission?.timer ?? side?.timer;
    if (timer > 0) label(context, `${Math.ceil(timer)}s`, 24 + width - 14, 117, 13, timer < 20 ? PALETTE.danger : PALETTE.accent, 'right');
  }

  function dialogue(context, state) {
    if (!state.dialogue) return;
    const line = state.dialogue.lines[state.dialogue.index] ?? '';
    context.fillStyle = 'rgba(8,18,28,0.86)';
    context.fillRect(VIEW.width / 2 - 340, VIEW.height - 158, 680, 62);
    context.strokeStyle = 'rgba(242,181,68,0.65)';
    context.lineWidth = 2;
    context.strokeRect(VIEW.width / 2 - 340, VIEW.height - 158, 680, 62);
    label(context, line, VIEW.width / 2 - 320, VIEW.height - 120, 17, PALETTE.text);
  }

  function toasts(context, state) {
    let y = VIEW.height - 92;
    for (let index = state.toasts.length - 1; index >= 0; index -= 1) {
      const toast = state.toasts[index];
      const alpha = Math.min(1, toast.life / 0.5);
      context.globalAlpha = alpha;
      context.font = `14px ${FONT}`;
      const width = Math.max(240, context.measureText(toast.text).width + 34);
      context.fillStyle = 'rgba(8,18,28,0.82)';
      context.fillRect(24, y - 22, width, 30);
      label(context, toast.text, 38, y - 1, 14, toast.color);
      context.globalAlpha = 1;
      y -= 36;
    }
  }

  function driveInfo(context, state) {
    const car = state.player.inCar;
    if (!car) return;
    const speed = Math.round(Math.abs(car.speed) * 0.62);
    const centreX = VIEW.width / 2;
    context.fillStyle = 'rgba(8,18,28,0.7)';
    context.fillRect(centreX - 82, VIEW.height - 94, 164, 52);
    label(context, `${speed}`, centreX - 12, VIEW.height - 55, 32, PALETTE.text, 'right', 'bold');
    label(context, 'KM/H', centreX + 2, VIEW.height - 57, 12, PALETTE.muted);
    context.fillStyle = car.damage > 70 ? PALETTE.danger : PALETTE.accent;
    context.fillRect(centreX - 70, VIEW.height - 50, 140 * Math.min(1, car.damage / 100), 3);
    label(context, car.name, centreX, VIEW.height - 104, 13, PALETTE.muted, 'center');
  }

  function areaPopup(context, state) {
    if (state.areaTimer <= 0) return;
    const alpha = Math.min(1, state.areaTimer);
    context.globalAlpha = alpha;
    label(context, state.area, VIEW.width / 2, 132, 26, PALETTE.text, 'center', 'bold');
    context.globalAlpha = 1;
  }

  function draw(context, worldState, ui, screen) {
    if (screen === 'title') return;
    const state = worldState.state;
    const player = state.player;

    meter(context, 24, 34, 178, 16, player.health, 100, PALETTE.danger, 'HEALTH');
    meter(context, 24, 68, 178, 14, player.armor, 100, '#79bce4', 'ARMOR');
    label(context, `$${player.money}`, 24, 114, 24, PALETTE.accent, 'left', 'bold');
    label(context, `RESPECT ${state.respect}`, 24, 134, 12, PALETTE.muted, 'left', 'bold');
    stars(context, state);
    minimap.draw(context);

    const weapon = WEAPONS[player.weapon];
    context.fillStyle = 'rgba(8,18,28,0.8)';
    context.fillRect(VIEW.width - 306, VIEW.height - 82, 282, 58);
    label(context, weapon.name, VIEW.width - 292, VIEW.height - 58, 16, PALETTE.text, 'left', 'bold');
    label(context, player.weapon === 'fists' ? '—' : `${player.ammo} / ${player.reserve}`, VIEW.width - 32, VIEW.height - 54, 20,
      player.ammo === 0 ? PALETTE.danger : PALETTE.accent, 'right', 'bold');
    label(context, player.reload > 0 ? 'RELOADING…' : '[1] Fists  [2] Pistol  [3] SMG  [R] Reload',
      VIEW.width - 292, VIEW.height - 36, 11, PALETTE.muted);

    objective(context, state);
    areaPopup(context, state);
    driveInfo(context, state);
    toasts(context, state);
    dialogue(context, state);

    const nearGarage = Math.hypot(player.x - world.city.garage.x, player.y - world.city.garage.y) < world.city.garage.radius;
    if (nearGarage) label(context, 'E — Pay & Spray ($500)', VIEW.width / 2, VIEW.height - 176, 15, PALETTE.accent, 'center', 'bold');
    if (!player.inCar) {
      const nearCar = world.systems.vehicles?.nearest(player.x, player.y, 72);
      if (nearCar) label(context, 'E — Jack vehicle', VIEW.width / 2, VIEW.height - 196, 15, PALETTE.text, 'center');
    } else {
      label(context, 'E/F — Exit   H — Horn   Space — Handbrake', VIEW.width / 2, VIEW.height - 196, 14, PALETTE.text, 'center');
    }
    if (audio.muted) label(context, 'MUTED (M)', VIEW.width - 24, 24, 12, PALETTE.danger, 'right', 'bold');
    context.fillStyle = 'rgba(8,18,28,0.45)';
    context.fillRect(20, VIEW.height - 30, 470, 22);
    label(context, 'WASD walk/drive · Shift run · Mouse aim · Click fire · Esc menu · M mute',
      30, VIEW.height - 14, 12, PALETTE.muted);
  }

  return { draw };
}
