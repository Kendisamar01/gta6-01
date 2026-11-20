import { FONT, VIEW } from './config.js';

export const TITLE_ITEMS = ['NEW GAME', 'CONTINUE', 'CONTROLS'];
export const PAUSE_ITEMS = ['RESUME', 'CONTROLS', 'SAVE GAME', 'LOAD GAME', 'QUIT TO TITLE'];

function write(ctx, value, x, y, size, color, align = 'left', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, width, height, fill = 'rgba(11,22,30,0.9)') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,226,170,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function palm(ctx, x, y, scale, lean, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(lean * 44 - 10, -74, lean * 76, -138);
  ctx.lineTo(lean * 76 + 8, -136);
  ctx.quadraticCurveTo(lean * 44 + 10, -70, 6, 0);
  ctx.fill();
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const angle = -Math.PI + leaf * Math.PI / 6;
    const tipX = lean * 76 + Math.cos(angle) * 66;
    const tipY = -138 + Math.sin(angle) * 32;
    ctx.beginPath();
    ctx.moveTo(lean * 76, -138);
    ctx.quadraticCurveTo((lean * 76 + tipX) / 2, -182, tipX, tipY);
    ctx.quadraticCurveTo((lean * 76 + tipX) / 2, -148, lean * 76, -138);
    ctx.fill();
  }
  ctx.restore();
}

function skyline(ctx, phase) {
  ctx.fillStyle = 'rgba(28,43,53,0.7)';
  for (let i = 0; i < 22; i += 1) {
    const width = 28 + ((i * 37) % 46);
    const height = 48 + ((i * 71) % 130);
    const x = i * 64 - 20;
    ctx.fillRect(x, 432 - height, width, height);
    ctx.fillStyle = 'rgba(255,218,138,0.16)';
    for (let row = 0; row < Math.floor(height / 18); row += 1) {
      if ((i + row + Math.floor(phase / 12)) % 3 === 0) {
        ctx.fillRect(x + 6, 440 - height + row * 18, width - 12, 4);
      }
    }
    ctx.fillStyle = 'rgba(28,43,53,0.7)';
  }
}

function titleBackdrop(ctx, world) {
  const phase = world.stepHint;
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, '#1d3550');
  sky.addColorStop(0.32, '#5a6b83');
  sky.addColorStop(0.56, '#e99068');
  sky.addColorStop(0.72, '#f6c17b');
  sky.addColorStop(1, '#173b4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.fillStyle = 'rgba(255,224,160,0.85)';
  ctx.beginPath();
  ctx.arc(930, 316, 92, 0, Math.PI * 2);
  ctx.fill();
  skyline(ctx, phase);

  ctx.fillStyle = '#1c4a58';
  ctx.fillRect(0, 432, VIEW.width, 288);
  for (let i = 0; i < 16; i += 1) {
    const y = 448 + i * 17;
    ctx.strokeStyle = `rgba(255,213,148,${0.07 + (i % 3) * 0.025})`;
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    for (let x = -20; x <= VIEW.width + 20; x += 24) {
      const wave = y + Math.sin(x * 0.017 + phase * 0.04 + i) * (2 + i * 0.2);
      if (x === -20) ctx.moveTo(x, wave);
      else ctx.lineTo(x, wave);
    }
    ctx.stroke();
  }

  palm(ctx, 92, 690, 1.65, -0.12, '#142d31');
  palm(ctx, 1196, 700, 1.9, 0.14, '#142d31');
  palm(ctx, 1090, 706, 1.2, -0.08, '#17373a');

  ctx.fillStyle = 'rgba(10,24,32,0.36)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function menuLine(ctx, value, x, y, selected, disabled = false) {
  if (selected) {
    ctx.fillStyle = 'rgba(255,207,107,0.16)';
    ctx.beginPath();
    ctx.roundRect(x - 18, y - 30, 300, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x - 18, y - 30, 4, 44);
  }
  write(ctx, value, x, y, 23, disabled ? '#829296' : selected ? '#fff4d5' : '#c5d2d2', 'left', '800');
  if (disabled) write(ctx, 'NO SAVE', x + 272, y, 11, '#829296', 'left', '700');
}

export function drawTitle(ctx, world) {
  titleBackdrop(ctx, world);
  write(ctx, 'MAKE FUN PRESENTS', 640, 118, 14, '#ffe0a8', 'center', '800');
  ctx.save();
  ctx.shadowColor = 'rgba(20,15,20,0.65)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  write(ctx, 'SOLARA', 640, 244, 104, '#fff4d9', 'center', '900');
  write(ctx, 'BAY', 640, 348, 116, '#ffd166', 'center', '900');
  ctx.restore();
  write(ctx, 'SUN, SAND, AND A CITY THAT NEVER SLEEPS', 640, 382, 15, '#e9dcc2', 'center', '700');

  panel(ctx, 430, 420, 420, 206, 'rgba(12,27,36,0.72)');
  const index = world.menu.index;
  menuLine(ctx, TITLE_ITEMS[0], 464, 470, index === 0);
  menuLine(ctx, TITLE_ITEMS[1], 464, 522, index === 1, !world.hasSave);
  menuLine(ctx, TITLE_ITEMS[2], 464, 574, index === 2);
  write(ctx, 'W/S or arrows to choose · Enter to select', 640, 656, 13, '#c8d7d5', 'center', '600');
  write(ctx, 'Keyboard + mouse · M toggles sound · fully offline', 640, 684, 12, '#9fb8bb', 'center', '600');
}

export function drawControls(ctx) {
  ctx.fillStyle = 'rgba(8,18,25,0.88)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 190, 80, 900, 560);
  write(ctx, 'CONTROLS', 640, 136, 42, '#ffd977', 'center', '900');
  const rows = [
    ['WASD / Arrows', 'Walk, run, steer and accelerate'],
    ['Shift', 'Run on foot'],
    ['Mouse', 'Aim'],
    ['Left click', 'Punch or shoot'],
    ['E / F', 'Enter or jack a car · F also exits'],
    ['Space', 'Handbrake / drift'],
    ['H', 'Horn'],
    ['R', 'Reload the pistol'],
    ['1 / 2', 'Fists / pistol'],
    ['Esc or P', 'Pause menu'],
    ['M', 'Mute audio'],
  ];
  rows.forEach(([key, description], i) => {
    const y = 190 + i * 40;
    write(ctx, key, 250, y, 18, '#ffd166', 'left', '800');
    write(ctx, description, 470, y, 18, '#e4ece7', 'left', '600');
  });
  write(ctx, 'Enter / Esc to go back', 640, 618, 14, '#9fb8bb', 'center', '700');
}

export function drawPause(ctx, world) {
  ctx.fillStyle = 'rgba(6,16,23,0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 420, 130, 440, 450);
  write(ctx, 'PAUSED', 640, 190, 42, '#ffd977', 'center', '900');
  write(ctx, world.area.name.toUpperCase(), 640, 222, 14, '#b9cac9', 'center', '700');
  PAUSE_ITEMS.forEach((item, i) => menuLine(ctx, item, 486, 282 + i * 50, world.menu.index === i));
  write(ctx, 'W/S choose · Enter select · Esc resume', 640, 652, 13, '#a9bdbd', 'center', '600');
}

export function drawEnd(ctx, world, kind) {
  ctx.fillStyle = kind === 'busted' ? 'rgba(16,28,56,0.82)' : 'rgba(48,12,16,0.8)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 390, 210, 500, 280);
  write(ctx, kind === 'busted' ? 'BUSTED' : 'WASTED', 640, 320, 68,
    kind === 'busted' ? '#8fc9ff' : '#ff7e6e', 'center', '900');
  write(ctx, kind === 'busted'
    ? 'The bay precinct thanks you for your cooperation.'
    : 'The bay keeps spinning without you.',
  640, 368, 17, '#e5e9e2', 'center', '600');
  write(ctx, `You lost $${world.endLoss ?? 0} and your heat.`, 640, 402, 15, '#c0cccb', 'center', '600');
  const remaining = Math.max(0, world.respawnTimer);
  write(ctx, remaining > 0
    ? `Respawning in ${remaining.toFixed(1)}s`
    : 'Press Enter to get back out there',
  640, 458, 16, '#ffd977', 'center', '800');
}

export const PAUSE_ITEM_COUNT = PAUSE_ITEMS.length;
export const TITLE_ITEM_COUNT = TITLE_ITEMS.length;
