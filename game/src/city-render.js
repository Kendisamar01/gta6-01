import { FONT, MAP, PALETTE } from './config.js';
import { daylight, nightTime, paintSignalLamps } from './environment.js';

const SIGN_STYLE = {
  rampage: { color: '#c95d52', glyph: 'R', title: 'NEON RANGE' },
  spray: { color: '#55a8c6', glyph: 'P', title: 'PAINT & BODY' },
  taxi: { color: '#e8bd3e', glyph: 'T', title: 'SUNFARE' },
  garage: { color: '#8e7fc0', glyph: 'G', title: 'VESPER' },
  cafe: { color: '#d78e63', glyph: 'C', title: 'CAFE ASTRA' },
  hospital: { color: '#e6e9e5', glyph: '+', title: 'CLINIC' },
  police: { color: '#4f74b4', glyph: 'S', title: 'PRECINCT' },
  delivery: { color: '#b08b62', glyph: 'D', title: 'HARBOR DEPOT' },
  yacht: { color: '#3fa39f', glyph: 'Y', title: 'AZURE LANTERN' },
  safehouse: { color: '#6ba971', glyph: 'H', title: 'PALM VISTA' },
};

function inView(x, y, view, margin = 0) {
  return x >= view.left - margin && x <= view.right + margin
    && y >= view.top - margin && y <= view.bottom + margin;
}

function ripple(ctx, from, to, y, step, amplitude, phase, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let started = false;
  for (let x = from; x <= to; x += step) {
    const offset = y + Math.sin(x * 0.017 + phase) * amplitude;
    if (!started) {
      ctx.moveTo(x, offset);
      started = true;
    } else ctx.lineTo(x, offset);
  }
  ctx.stroke();
}

export function paintGround(ctx, view) {
  const width = view.right - view.left;
  const height = view.bottom - view.top;
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(view.left, view.top, width, height);

  if (view.bottom <= MAP.sandLine) return;

  ctx.fillStyle = PALETTE.sandShade;
  ctx.fillRect(view.left, MAP.sandLine, width, MAP.seaLine - MAP.sandLine);
  for (let band = 0; band < 4; band += 1) {
    ripple(ctx, Math.floor(view.left / 60) * 60, view.right + 60,
      MAP.sandLine + 22 + band * 36, 60, 5, band * 1.7,
      'rgba(255,255,255,0.42)', 3);
  }

  const sea = ctx.createLinearGradient(0, MAP.seaLine, 0, MAP.seaLine + 360);
  sea.addColorStop(0, PALETTE.sea);
  sea.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(view.left, MAP.seaLine, width, Math.max(0, view.bottom - MAP.seaLine));
  for (let band = 0; band < 7; band += 1) {
    ripple(ctx, Math.floor(view.left / 90) * 90, view.right + 90,
      MAP.seaLine + 18 + band * 44, 90, 8, band * 2.1,
      'rgba(232,242,232,0.28)', 4);
  }
}

export function paintStreets(ctx, view) {
  const rightEdge = MAP.first + (MAP.columns - 1) * MAP.step;
  const bottomEdge = MAP.first + (MAP.rows - 1) * MAP.step;

  ctx.fillStyle = PALETTE.tarmac;
  for (let column = 0; column < MAP.columns; column += 1) {
    const x = MAP.first + column * MAP.step;
    if (!inView(x, view.top, view, MAP.road)) continue;
    ctx.fillRect(x - MAP.road / 2, 0, MAP.road, Math.min(MAP.seaLine, bottomEdge + MAP.road));
  }
  for (let row = 0; row < MAP.rows; row += 1) {
    const y = MAP.first + row * MAP.step;
    if (!inView(view.left, y, view, MAP.road)) continue;
    ctx.fillRect(0, y - MAP.road / 2, Math.min(MAP.width, rightEdge + MAP.road), MAP.road);
  }

  ctx.fillStyle = PALETTE.tarmacEdge;
  for (let column = 0; column < MAP.columns; column += 1) {
    const x = MAP.first + column * MAP.step;
    if (!inView(x, view.top, view, MAP.road)) continue;
    ctx.fillRect(x - MAP.road / 2, 0, 3, MAP.seaLine);
    ctx.fillRect(x + MAP.road / 2 - 3, 0, 3, MAP.seaLine);
  }
  for (let row = 0; row < MAP.rows; row += 1) {
    const y = MAP.first + row * MAP.step;
    if (!inView(view.left, y, view, MAP.road)) continue;
    ctx.fillRect(0, y - MAP.road / 2, MAP.width, 3);
    ctx.fillRect(0, y + MAP.road / 2 - 3, MAP.width, 3);
  }

  ctx.save();
  ctx.strokeStyle = PALETTE.stripe;
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([20, 26]);
  for (let column = 0; column < MAP.columns; column += 1) {
    const x = MAP.first + column * MAP.step;
    if (!inView(x, view.top, view, MAP.road)) continue;
    ctx.beginPath();
    ctx.moveTo(x, Math.max(0, view.top - 40));
    ctx.lineTo(x, Math.min(MAP.seaLine, view.bottom + 40));
    ctx.stroke();
  }
  for (let row = 0; row < MAP.rows; row += 1) {
    const y = MAP.first + row * MAP.step;
    if (!inView(view.left, y, view, MAP.road)) continue;
    ctx.beginPath();
    ctx.moveTo(Math.max(0, view.left - 40), y);
    ctx.lineTo(Math.min(MAP.width, view.right + 40), y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(245,242,230,0.65)';
  for (let column = 0; column < MAP.columns; column += 1) {
    const x = MAP.first + column * MAP.step;
    for (let row = 0; row < MAP.rows; row += 1) {
      const y = MAP.first + row * MAP.step;
      if (!inView(x, y, view, 60)) continue;
      for (let slot = 0; slot < 4; slot += 1) {
        const along = 5 + slot * 12;
        ctx.fillRect(x - MAP.road / 2 + along, y - MAP.road / 2 + 5, 7, 7);
        ctx.fillRect(x - MAP.road / 2 + along, y + MAP.road / 2 - 12, 7, 7);
        ctx.fillRect(x - MAP.road / 2 + 5, y - MAP.road / 2 + along, 7, 7);
        ctx.fillRect(x + MAP.road / 2 - 12, y - MAP.road / 2 + along, 7, 7);
      }
    }
  }
}

function paintStructure(ctx, building, world) {
  const dim = nightTime(world);
  const { x, y, w, h } = building;
  ctx.fillStyle = 'rgba(28,32,34,0.26)';
  ctx.fillRect(x + 8, y + 9, w, h);
  ctx.fillStyle = building.wall;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(30,34,40,0.18)';
  ctx.fillRect(x + w - 9, y, 9, h);
  ctx.fillRect(x, y + h - 7, w, 7);
  ctx.fillStyle = building.roof;
  ctx.fillRect(x + 5, y + 5, w - 14, h - 14);
  ctx.strokeStyle = building.edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

  if (building.form === 'tower') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let stripe = 0; stripe < 3; stripe += 1) {
      ctx.fillRect(x + 12 + stripe * 14, y + 12, 5, h - 28);
    }
  }

  const columns = Math.max(2, Math.floor(w / 15));
  const rows = Math.max(1, Math.floor(h / 16));
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const wx = x + 8 + column * ((w - 16) / columns);
      const wy = y + 9 + row * ((h - 18) / rows);
      if (wx + 6 > x + w - 7 || wy + 6 > y + h - 8) continue;
      const lit = dim && ((row * 7 + column * 5 + Math.floor(building.grain * 100)) % 9) < 3;
      ctx.fillStyle = lit ? 'rgba(255,224,150,0.85)' : 'rgba(40,58,68,0.55)';
      ctx.fillRect(wx, wy, 6, 7);
    }
  }

  if (!building.board) return;
  ctx.fillStyle = dim ? '#e8b451' : '#30424a';
  const boardWidth = Math.min(w - 12, building.board.length * 11 + 16);
  ctx.fillRect(x + 6, y - 12, boardWidth, 18);
  ctx.fillStyle = dim ? '#24323a' : '#f4e8c8';
  ctx.font = `800 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(building.board, x + 14, y + 1);
}

function paintVenue(ctx, plot, world) {
  if (!plot.special) return;
  const style = SIGN_STYLE[plot.special.kind] ?? { color: '#c8a36b', glyph: '•', title: plot.special.label };
  const pulse = 0.5 + 0.5 * Math.sin(world.tickHint * 0.045);
  ctx.fillStyle = 'rgba(18,28,34,0.12)';
  ctx.fillRect(plot.x + 12, plot.y + 12, plot.size - 24, plot.size - 24);
  ctx.fillStyle = style.color;
  ctx.globalAlpha = 0.22 + pulse * 0.1;
  ctx.beginPath();
  ctx.arc(plot.cx, plot.cy, 44 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(plot.cx, plot.cy, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17232b';
  ctx.font = `900 25px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(style.glyph, plot.cx, plot.cy + 9);
  ctx.font = `800 10px ${FONT}`;
  ctx.fillStyle = 'rgba(24,35,42,0.82)';
  ctx.fillText(style.title, plot.cx, plot.y + plot.size - 8);
}

export function paintBlocks(ctx, world, view) {
  for (const plot of world.city.plots) {
    if (!inView(plot.cx, plot.cy, view, plot.size)) continue;
    ctx.fillStyle = PALETTE.pavement;
    ctx.fillRect(plot.x - MAP.walk, plot.y - MAP.walk, plot.size + MAP.walk * 2, plot.size + MAP.walk * 2);
    ctx.strokeStyle = PALETTE.kerb;
    ctx.lineWidth = 2;
    ctx.strokeRect(plot.x - MAP.walk + 1, plot.y - MAP.walk + 1,
      plot.size + MAP.walk * 2 - 2, plot.size + MAP.walk * 2 - 2);
    ctx.fillStyle = plot.kind === 'park' ? PALETTE.lawn : plot.kind === 'lot' ? '#c3ad86' : '#b8b19a';
    ctx.fillRect(plot.x, plot.y, plot.size, plot.size);

    if (plot.kind === 'park') {
      ctx.strokeStyle = 'rgba(238,222,182,0.6)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(plot.x, plot.cy);
      ctx.lineTo(plot.x + plot.size, plot.cy);
      ctx.moveTo(plot.cx, plot.y);
      ctx.lineTo(plot.cx, plot.y + plot.size);
      ctx.stroke();
      for (const tree of plot.greenery) {
        ctx.fillStyle = PALETTE.lawnShade;
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, 13 * tree.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7fae67';
        ctx.beginPath();
        ctx.arc(tree.x - 4, tree.y - 4, 8 * tree.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    paintVenue(ctx, plot, world);
    for (const building of plot.structures) paintStructure(ctx, building, world);
  }
}

function paintPalm(ctx, palm) {
  ctx.save();
  ctx.translate(palm.x, palm.y);
  ctx.scale(palm.scale, palm.scale);
  ctx.strokeStyle = '#7b5a3a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(palm.lean * 34, -34, palm.lean * 58, -80);
  ctx.stroke();
  ctx.strokeStyle = '#4f824c';
  ctx.lineWidth = 7;
  for (let leaf = 0; leaf < 6; leaf += 1) {
    const angle = -Math.PI + leaf * (Math.PI / 5.6);
    const tipX = palm.lean * 58 + Math.cos(angle) * 35;
    const tipY = -80 + Math.sin(angle) * 22;
    ctx.beginPath();
    ctx.moveTo(palm.lean * 58, -80);
    ctx.quadraticCurveTo((palm.lean * 58 + tipX) / 2, -103, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

export function paintFurniture(ctx, world, view) {
  for (const palm of world.city.palms) {
    if (inView(palm.x, palm.y, view, 60)) paintPalm(ctx, palm);
  }
  for (const item of world.city.furnishings) {
    if (!inView(item.x, item.y, view, 20)) continue;
    if (item.kind === 'bench') {
      ctx.fillStyle = '#8a6844';
      ctx.fillRect(item.x - 12, item.y - 4, 24, 7);
      ctx.fillStyle = '#51483d';
      ctx.fillRect(item.x - 10, item.y + 3, 3, 6);
      ctx.fillRect(item.x + 7, item.y + 3, 3, 6);
    } else {
      ctx.fillStyle = '#4d6b66';
      ctx.fillRect(item.x - 5, item.y - 6, 10, 12);
      ctx.fillStyle = '#314b48';
      ctx.fillRect(item.x - 6, item.y - 7, 12, 3);
    }
  }
  for (const lamp of world.city.lamps) {
    if (!inView(lamp.x, lamp.y, view, 20)) continue;
    ctx.fillStyle = '#59646a';
    ctx.fillRect(lamp.x - 2, lamp.y - 30, 4, 30);
    ctx.fillStyle = nightTime(world) ? '#ffe3a5' : '#cfd4cb';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 31, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const signal of world.city.signals) {
    if (inView(signal.x, signal.y, view, 20)) paintSignalLamps(ctx, signal, world);
  }
}

function paintPin(ctx, marker, world, color) {
  const pulse = 0.5 + 0.5 * Math.sin(world.tickHint * 0.09);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 + pulse * 0.35;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 24 + pulse * 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, Math.min(52, (marker.radius ?? 60) * 0.6), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 16 - pulse * 4);
  ctx.lineTo(marker.x + 11, marker.y + 4);
  ctx.lineTo(marker.x, marker.y - 1);
  ctx.lineTo(marker.x - 11, marker.y + 4);
  ctx.closePath();
  ctx.fill();
  if (marker.label) {
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = 'center';
    const width = ctx.measureText(marker.label).width + 20;
    ctx.fillStyle = 'rgba(15,25,31,0.82)';
    ctx.beginPath();
    ctx.roundRect(marker.x - width / 2, marker.y - 58 - pulse * 4, width, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#fff2d1';
    ctx.fillText(marker.label, marker.x, marker.y - 42 - pulse * 4);
  }
  ctx.restore();
}

export function paintMarkers(ctx, world, view) {
  const pins = [];
  if (!world.mission.active && !world.mission.failed && world.storyPin) {
    pins.push({ ...world.storyPin, shade: '#ffd166' });
  }
  if (world.mission.pin) pins.push({ ...world.mission.pin, shade: '#ffb64f' });
  if (world.activity.pin) pins.push({ ...world.activity.pin, shade: '#6de2d8' });
  for (const pin of pins) {
    if (inView(pin.x, pin.y, view, 120)) paintPin(ctx, pin, world, pin.shade);
  }
}

export function paintSunwash(ctx, world, view) {
  const light = daylight(world);
  if (light > 0.75) return;
  ctx.fillStyle = `rgba(255,174,102,${(0.75 - light) * 0.16})`;
  ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
}
