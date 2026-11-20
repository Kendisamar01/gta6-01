import { FIELD, FONT, PALETTE } from './config.js';

const TONES = {
  info: '#dcecf3',
  good: '#8fe0a7',
  warn: '#ffd27a',
  danger: '#ff8a7a',
};

function box(context, x, y, width, height, alpha = 0.74) {
  context.fillStyle = `rgba(11, 20, 32, ${alpha})`;
  context.fillRect(x, y, width, height);
  context.strokeStyle = 'rgba(236, 208, 143, 0.35)';
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function text(context, value, x, y, size, color, align = 'left') {
  context.font = `${size}px ${FONT}`;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillText(value, x, y);
}

export function createHud(world) {
  const state = world.state;
  if (!Array.isArray(state.toasts)) state.toasts = [];
  const toasts = state.toasts;

  function toast(message, kind = 'info') {
    toasts.push({ message, kind: TONES[kind] || TONES.info, life: 4.2, max: 4.2 });
    if (toasts.length > 5) toasts.shift();
    if (state.systems && state.systems.audio) state.systems.audio.play('blip');
  }

  function step(dt) {
    for (let index = toasts.length - 1; index >= 0; index -= 1) {
      toasts[index].life -= dt;
      if (toasts[index].life <= 0) toasts.splice(index, 1);
    }
  }

  function drawDialogue(context) {
    const run = state.missions;
    if (!run || (run.phase !== 'brief' && run.phase !== 'result')) return;
    const line = run.chat[run.chatIndex] || (run.phase === 'brief' ? 'Get moving.' : 'Press E to continue.');
    const width = 760;
    const x = (FIELD.width - width) / 2;
    const y = FIELD.height - 186;
    box(context, x, y, width, 108, 0.9);
    const character = run.mission && run.mission.giver ? run.mission.giver : 'sombra';
    const names = { marco: 'MARCO REY', sombra: 'LA SOMBRA', vale: 'DETECTIVE VALE', nia: 'NIA SOL' };
    text(context, names[character] || 'SOLARA BAY', x + 24, y + 32, 17, '#ffd77a');
    text(context, line, x + 24, y + 65, 18, PALETTE.text);
    text(context, 'E  continue', x + width - 24, y + 90, 14, '#e9d8a8', 'right');
  }

  function drawProgress(context) {
    const run = state.missions;
    const mission = state.mission;
    if (mission && mission.objective) {
      const width = Math.max(320, Math.min(620, mission.objective.length * 10 + 60));
      const x = (FIELD.width - width) / 2;
      box(context, x, 142, width, 38, 0.72);
      text(context, mission.objective, FIELD.width / 2, 167, 17, '#ffe7a8', 'center');
    }
    if (run && run.timer > 0 && run.phase === 'active') {
      const seconds = Math.max(0, Math.ceil(run.timer));
      text(context, `${seconds}s`, FIELD.width / 2, 194, 22, seconds < 12 ? '#ff8a7a' : '#fff0cf', 'center');
    }
    if (run) {
      text(context, `RESPECT ${run.respect}`, 24, 128, 14, '#bcd6e4');
      text(context, `JOBS ${run.finished}/${9}`, 24, 147, 14, '#bcd6e4');
    }
  }

  function drawWeapon(context) {
    const player = state.player;
    const combat = state.combat;
    const right = FIELD.width - 24;
    const y = FIELD.height - 142;
    box(context, right - 250, y - 30, 250, 62, 0.7);
    const label = combat ? combat.weapon.toUpperCase() : (player.weapon || 'FISTS').toUpperCase();
    text(context, label, right - 16, y - 7, 17, '#ffe7a8', 'right');
    const ammo = combat ? `${combat.mag} / ${combat.reserve}` : `${player.ammo || 0}`;
    text(context, combat && combat.reloadTimer > 0 ? 'RELOADING' : ammo, right - 16, y + 21, 20, '#e7f0f3', 'right');
    if (player.armor > 0) text(context, `ARMOR ${Math.ceil(player.armor)}`, 24, 88, 13, '#8ccce8');
  }

  function drawSpeed(context) {
    const player = state.player;
    if (!player.vehicle) return;
    const manager = state.systems && state.systems.vehicles;
    const speed = manager ? manager.speedOf(player.vehicle) : Math.abs(player.speed);
    const right = FIELD.width - 24;
    const y = FIELD.height - 72;
    box(context, right - 250, y - 34, 250, 52, 0.72);
    text(context, `${Math.round(speed * 0.42)} KM/H`, right - 16, y, 25, '#fff0cf', 'right');
    text(context, player.vehicle.type.toUpperCase(), right - 16, y + 12, 11, '#a9c3cd', 'right');
  }

  function drawPrompt(context) {
    const player = state.player;
    let prompt = '';
    if (player.vehicle) prompt = 'E  exit vehicle  ·  H  horn  ·  Shift  handbrake';
    else {
      const manager = state.systems && state.systems.vehicles;
      const wanted = state.systems && state.systems.wanted;
      let target = null;
      let gap = 70;
      if (manager) {
        target = manager.nearest(player.x, player.y, 64);
        if (target) gap = Math.hypot(target.x - player.x, target.y - player.y);
      }
      if (wanted && wanted.atShop && wanted.atShop() && player.wanted > 0) {
        prompt = `E  detail & clean record  $${wanted.shop.cost}`;
      } else if (target && gap < 64) {
        prompt = target.siren ? 'E  jack cruiser' : `E  drive ${target.type}`;
      } else if (state.missions && state.missions.phase === 'idle') {
        prompt = 'Find the yellow marker to start a job';
      }
    }
    if (!prompt) return;
    const width = Math.max(240, prompt.length * 9 + 40);
    box(context, (FIELD.width - width) / 2, FIELD.height - 128, width, 30, 0.66);
    text(context, prompt, FIELD.width / 2, FIELD.height - 107, 15, '#ffe7a8', 'center');
  }

  function drawToasts(context) {
    for (let index = 0; index < toasts.length; index += 1) {
      const entry = toasts[index];
      const alpha = Math.min(1, entry.life / 0.6);
      const y = 214 + index * 28;
      context.globalAlpha = alpha;
      box(context, 24, y - 18, 380, 26, 0.68);
      text(context, entry.message, 36, y, 14, entry.kind);
      context.globalAlpha = 1;
    }
  }

  function draw(context, view) {
    if (view.screen === 'title') return;
    drawProgress(context);
    drawWeapon(context);
    drawSpeed(context);
    drawPrompt(context);
    drawToasts(context);
    drawDialogue(context);
    if (state.busted) {
      context.fillStyle = 'rgba(10, 20, 38, 0.55)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      text(context, 'BUSTED', FIELD.width / 2, FIELD.height / 2 - 40, 64, '#ff8a7a', 'center');
      text(context, 'Vale will bail you out. Eventually.', FIELD.width / 2, FIELD.height / 2 + 8, 20, '#fff0cf', 'center');
    }
  }

  function reset() {
    toasts.length = 0;
  }

  return { toasts, toast, step, draw, reset };
}

let current = null;

export function install(context) {
  current = createHud(context.world);
  context.systems.hud = current;
}

export function toast(message, kind) {
  if (current) current.toast(message, kind);
}
