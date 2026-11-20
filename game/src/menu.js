import { FONT, SCREEN } from './config.js';

export const TITLE_ITEMS = ['NEW GAME', 'CONTINUE', 'CONTROLS'];
export const PAUSE_ITEMS = ['RESUME', 'CONTROLS', 'SAVE GAME', 'LOAD GAME', 'QUIT TO TITLE'];
export const TITLE_ITEM_COUNT = TITLE_ITEMS.length;
export const PAUSE_ITEM_COUNT = PAUSE_ITEMS.length;

function type(ctx, value, x, y, size, color, align = 'left', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function card(ctx, x, y, width, height, fill = 'rgba(12,26,35,0.9)') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,226,170,0.34)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function palm(ctx, x, y, scale, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#173b3e';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * 30, -62, lean * 68, -132);
  ctx.stroke();
  ctx.fillStyle = '#214d44';
  for (let leaf = 0; leaf < 8; leaf += 1) {
    const angle = -Math.PI + leaf * Math.PI / 7;
    const tipX = lean * 68 + Math.cos(angle) * 70;
    const tipY = -132 + Math.sin(angle) * 34;
    ctx.beginPath();
    ctx.moveTo(lean * 68, -132);
    ctx.quadraticCurveTo((lean * 68 + tipX) / 2, -188, tipX, tipY);
    ctx.quadraticCurveTo((lean * 68 + tipX) / 2, -146, lean * 68, -132);
    ctx.fill();
  }
  ctx.restore();
}

function buildings(ctx, phase) {
  for (let i = 0; i < 21; i += 1) {
    const width = 32 + ((i * 41) % 52);
    const height = 54 + ((i * 79) % 138);
    const x = i * 66 - 30;
    ctx.fillStyle = 'rgba(27,43,54,0.72)';
    ctx.fillRect(x, 438 - height, width, height);
    ctx.fillStyle = 'rgba(255,218,138,0.14)';
    for (let row = 0; row < Math.floor(height / 20); row += 1) {
      if ((i + row + Math.floor(phase / 14)) % 4 === 0) {
        ctx.fillRect(x + 7, 446 - height + row * 20, width - 14, 4);
      }
    }
  }
}

function titleScene(ctx, world) {
  const phase = world.tickHint;
  const sky = ctx.createLinearGradient(0, 0, 0, SCREEN.height);
  sky.addColorStop(0, '#1b3450');
  sky.addColorStop(0.3, '#59677e');
  sky.addColorStop(0.55, '#e68c66');
  sky.addColorStop(0.72, '#f4c17d');
  sky.addColorStop(1, '#153c4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);

  ctx.fillStyle = 'rgba(255,227,166,0.85)';
  ctx.beginPath();
  ctx.arc(942, 312, 90, 0, Math.PI * 2);
  ctx.fill();
  buildings(ctx, phase);

  ctx.fillStyle = '#1a4b58';
  ctx.fillRect(0, 438, SCREEN.width, SCREEN.height - 438);
  for (let band = 0; band < 16; band += 1) {
    const y = 454 + band * 17;
    ctx.strokeStyle = `rgba(255,213,148,${0.06 + (band % 3) * 0.025})`;
    ctx.lineWidth = 2 + (band % 3);
    ctx.beginPath();
    for (let x = -20; x <= SCREEN.width + 20; x += 24) {
      const wave = y + Math.sin(x * 0.017 + phase * 0.04 + band) * (2 + band * 0.2);
      if (x === -20) ctx.moveTo(x, wave);
      else ctx.lineTo(x, wave);
    }
    ctx.stroke();
  }

  palm(ctx, 86, 700, 1.62, -0.13);
  palm(ctx, 1198, 706, 1.84, 0.13);
  palm(ctx, 1082, 712, 1.16, -0.08);
  ctx.fillStyle = 'rgba(9,24,32,0.38)';
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
}

function option(ctx, label, x, y, selected, disabled = false) {
  if (selected) {
    ctx.fillStyle = 'rgba(255,207,107,0.16)';
    ctx.beginPath();
    ctx.roundRect(x - 18, y - 30, 300, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 18, y - 30, 4, 44);
  }
  type(ctx, label, x, y, 23, disabled ? '#829296' : selected ? '#fff4d5' : '#c5d2d2', 'left', '800');
  if (disabled) type(ctx, 'NO SAVE', x + 272, y, 11, '#829296', 'left', '700');
}

export function drawTitle(ctx, world) {
  titleScene(ctx, world);
  type(ctx, 'MAKE FUN PRESENTS', 640, 118, 14, '#ffe0a8', 'center', '800');
  ctx.save();
  ctx.shadowColor = 'rgba(18,14,18,0.65)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  type(ctx, 'SOLARA', 640, 244, 104, '#fff4d9', 'center', '900');
  type(ctx, 'BAY', 640, 348, 116, '#ffd166', 'center', '900');
  ctx.restore();
  type(ctx, 'SUN, SAND, AND A CITY THAT NEVER SLEEPS', 640, 382, 15, '#e9dcc2', 'center', '700');

  card(ctx, 430, 420, 420, 206, 'rgba(12,27,36,0.74)');
  option(ctx, TITLE_ITEMS[0], 464, 470, world.menu.index === 0);
  option(ctx, TITLE_ITEMS[1], 464, 522, world.menu.index === 1, !world.hasSave);
  option(ctx, TITLE_ITEMS[2], 464, 574, world.menu.index === 2);
  type(ctx, 'W/S or arrows to choose · Enter to select', 640, 656, 13, '#c8d7d5', 'center', '600');
  type(ctx, 'Keyboard + mouse · M toggles sound · fully offline', 640, 684, 12, '#9fb8bb', 'center', '600');
}

export function drawControls(ctx) {
  ctx.fillStyle = 'rgba(8,18,25,0.9)';
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
  card(ctx, 190, 80, 900, 560);
  type(ctx, 'CONTROLS', 640, 136, 42, '#ffd977', 'center', '900');
  const rows = [
    ['WASD / Arrows', 'Walk, run, steer and accelerate'],
    ['Shift', 'Run on foot'],
    ['Mouse', 'Aim'],
    ['Left click', 'Punch or shoot'],
    ['E', 'Mission / enter or leave car / pay for paint'],
    ['F', 'Start a side job'],
    ['Space', 'Handbrake / drift'],
    ['H', 'Horn'],
    ['R', 'Reload the sidearm'],
    ['1 / 2', 'Fists / sidearm'],
    ['Esc or P', 'Pause menu'],
    ['M', 'Mute audio'],
  ];
  rows.forEach(([key, description], i) => {
    const y = 184 + i * 35;
    type(ctx, key, 250, y, 17, '#ffd166', 'left', '800');
    type(ctx, description, 470, y, 17, '#e4ece7', 'left', '600');
  });
  type(ctx, 'Enter / Esc to go back', 640, 614, 14, '#9fb8bb', 'center', '700');
}

export function drawPause(ctx, world) {
  ctx.fillStyle = 'rgba(6,16,23,0.68)';
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
  card(ctx, 420, 130, 440, 450);
  type(ctx, 'PAUSED', 640, 190, 42, '#ffd977', 'center', '900');
  type(ctx, (world.area.name ?? 'Solara Bay').toUpperCase(), 640, 222, 14, '#b9cac9', 'center', '700');
  PAUSE_ITEMS.forEach((item, i) => {
    option(ctx, item, 486, 282 + i * 50, world.menu.index === i);
  });
  type(ctx, 'W/S choose · Enter select · Esc resume', 640, 652, 13, '#a9bdbd', 'center', '600');
}

export function drawEnd(ctx, world, kind) {
  ctx.fillStyle = kind === 'busted' ? 'rgba(16,28,56,0.82)' : 'rgba(48,12,16,0.8)';
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
  card(ctx, 390, 210, 500, 280);
  type(ctx, kind === 'busted' ? 'BUSTED' : 'WASTED', 640, 320, 68,
    kind === 'busted' ? '#8fc9ff' : '#ff7e6e', 'center', '900');
  type(ctx, kind === 'busted'
    ? 'The bay precinct thanks you for your cooperation.'
    : 'The bay keeps spinning without you.',
  640, 368, 17, '#e5e9e2', 'center', '600');
  type(ctx, `You lost $${world.endLoss ?? 0} and your heat.`, 640, 402, 15, '#c0cccb', 'center', '600');
  const remaining = Math.max(0, world.respawnTimer);
  type(ctx, remaining > 0
    ? `Respawning in ${remaining.toFixed(1)}s`
    : 'Press Enter to get back out there',
  640, 458, 16, '#ffd977', 'center', '800');
}
