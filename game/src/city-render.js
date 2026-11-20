import { COLORS, FONT, GRID, WORLD } from './config.js';
import { daylight, isNight } from './environment.js';
import { trafficLightGreen } from './city.js';

const VENUES = {
  rampage: { color: '#c95d52', glyph: 'R', name: 'ROOFTOP RANGE' },
  spray: { color: '#55a8c6', glyph: 'P', name: 'PAINT & BODY' },
  taxi: { color: '#e8bd3e', glyph: 'T', name: 'SUNFARE' },
  garage: { color: '#8e7fc0', glyph: 'G', name: 'SOMBRA' },
  cafe: { color: '#d78e63', glyph: 'C', name: 'CAFE CORAL' },
  hospital: { color: '#e6e9e5', glyph: '+', name: 'GENERAL' },
  police: { color: '#4f74b4', glyph: '★', name: 'PRECINCT' },
  delivery: { color: '#b08b62', glyph: 'D', name: 'HARBOR DEPOT' },
  yacht: { color: '#3fa39f', glyph: 'Y', name: 'GOLDEN HORN' },
  safehouse: { color: '#6ba971', glyph: 'H', name: 'PALM TERRACE' },
};

function visible(x, y, bounds, margin = 0) {
  return x >= bounds.left - margin && x <= bounds.right + margin
    && y >= bounds.top - margin && y <= bounds.bottom + margin;
}

function waveLine(ctx, startX, endX, y, step, amplitude, phase, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let first = true;
  for (let x = startX; x <= endX; x += step) {
    const offset = y + Math.sin(x * 0.017 + phase) * amplitude;
    if (first) {
      ctx.moveTo(x, offset);
      first = false;
    } else ctx.lineTo(x, offset);
  }
  ctx.stroke();
}

export function drawGround(ctx, bounds) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(bounds.left, bounds.top, width, height);

  if (bounds.bottom <= WORLD.beachY) return;

  ctx.fillStyle = COLORS.sandDark;
  ctx.fillRect(bounds.left, WORLD.beachY, width, WORLD.waterY - WORLD.beachY);
  for (let i = 0; i < 4; i += 1) {
    waveLine(ctx, Math.floor(bounds.left / 60) * 60, bounds.right + 60,
      WORLD.beachY + 22 + i * 36, 60, 5, i * 1.7, 'rgba(255,255,255,0.42)', 3);
  }

  const sea = ctx.createLinearGradient(0, WORLD.waterY, 0, WORLD.waterY + 360);
  sea.addColorStop(0, COLORS.water);
  sea.addColorStop(1, COLORS.waterDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(bounds.left, WORLD.waterY, width, Math.max(0, bounds.bottom - WORLD.waterY));
  for (let i = 0; i < 7; i += 1) {
    waveLine(ctx, Math.floor(bounds.left / 90) * 90, bounds.right + 90,
      WORLD.waterY + 18 + i * 44, 90, 8, i * 2.1, 'rgba(232,242,232,0.28)', 4);
  }
}

export function drawRoads(ctx, bounds) {
  const rightEdge = GRID.first + (GRID.columns - 1) * GRID.step;
  const bottomEdge = GRID.first + (GRID.rows - 1) * GRID.step;

  ctx.fillStyle = COLORS.asphalt;
  for (let column = 0; column < GRID.columns; column += 1) {
    const x = GRID.first + column * GRID.step;
    if (x < bounds.left - GRID.road || x > bounds.right + GRID.road) continue;
    ctx.fillRect(x - GRID.road / 2, 0, GRID.road, Math.min(WORLD.waterY, bottomEdge + GRID.road));
  }
  for (let row = 0; row < GRID.rows; row += 1) {
    const y = GRID.first + row * GRID.step;
    if (y < bounds.top - GRID.road || y > bounds.bottom + GRID.road) continue;
    ctx.fillRect(0, y - GRID.road / 2, Math.min(WORLD.width, rightEdge + GRID.road), GRID.road);
  }

  ctx.fillStyle = COLORS.asphaltDark;
  for (let column = 0; column < GRID.columns; column += 1) {
    const x = GRID.first + column * GRID.step;
    if (x < bounds.left - GRID.road || x > bounds.right + GRID.road) continue;
    ctx.fillRect(x - GRID.road / 2, 0, 3, WORLD.waterY);
    ctx.fillRect(x + GRID.road / 2 - 3, 0, 3, WORLD.waterY);
  }
  for (let row = 0; row < GRID.rows; row += 1) {
    const y = GRID.first + row * GRID.step;
    if (y < bounds.top - GRID.road || y > bounds.bottom + GRID.road) continue;
    ctx.fillRect(0, y - GRID.road / 2, WORLD.width, 3);
    ctx.fillRect(0, y + GRID.road / 2 - 3, WORLD.width, 3);
  }

  ctx.save();
  ctx.strokeStyle = COLORS.lane;
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([20, 26]);
  for (let column = 0; column < GRID.columns; column += 1) {
    const x = GRID.first + column * GRID.step;
    if (x < bounds.left - GRID.road || x > bounds.right + GRID.road) continue;
    ctx.beginPath();
    ctx.moveTo(x, Math.max(0, bounds.top - 40));
    ctx.lineTo(x, Math.min(WORLD.waterY, bounds.bottom + 40));
    ctx.stroke();
  }
  for (let row = 0; row < GRID.rows; row += 1) {
    const y = GRID.first + row * GRID.step;
    if (y < bounds.top - GRID.road || y > bounds.bottom + GRID.road) continue;
    ctx.beginPath();
    ctx.moveTo(Math.max(0, bounds.left - 40), y);
    ctx.lineTo(Math.min(WORLD.width, bounds.right + 40), y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(245,242,230,0.65)';
  for (let column = 0; column < GRID.columns; column += 1) {
    const x = GRID.first + column * GRID.step;
    for (let row = 0; row < GRID.rows; row += 1) {
      const y = GRID.first + row * GRID.step;
      if (!visible(x, y, bounds, 60)) continue;
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(x - GRID.road / 2 + 5 + i * 12, y - GRID.road / 2 + 5, 7, 7);
        ctx.fillRect(x - GRID.road / 2 + 5 + i * 12, y + GRID.road / 2 - 12, 7, 7);
        ctx.fillRect(x - GRID.road / 2 + 5, y - GRID.road / 2 + 5 + i * 12, 7, 7);
        ctx.fillRect(x + GRID.road / 2 - 12, y - GRID.road / 2 + 5 + i * 12, 7, 7);
      }
    }
  }
}

function paintBuilding(ctx, building, world) {
  const night = isNight(world);
  ctx.fillStyle = 'rgba(28,32,34,0.26)';
  ctx.fillRect(building.x + 8, building.y + 9, building.w, building.h);
  ctx.fillStyle = building.color;
  ctx.fillRect(building.x, building.y, building.w, building.h);
  ctx.fillStyle = 'rgba(30,34,40,0.18)';
  ctx.fillRect(building.x + building.w - 9, building.y, 9, building.h);
  ctx.fillRect(building.x, building.y + building.h - 7, building.w, 7);
  ctx.fillStyle = building.roof;
  ctx.fillRect(building.x + 5, building.y + 5, building.w - 14, building.h - 14);
  ctx.strokeStyle = building.trim;
  ctx.lineWidth = 2;
  ctx.strokeRect(building.x + 2, building.y + 2, building.w - 4, building.h - 4);

  if (building.style === 'tower') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let i = 0; i < 3; i += 1) {
      ctx.fillRect(building.x + 12 + i * 14, building.y + 12, 5, building.h - 28);
    }
  }

  const columns = Math.max(2, Math.floor(building.w / 15));
  const rows = Math.max(1, Math.floor(building.h / 16));
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const wx = building.x + 8 + column * ((building.w - 16) / columns);
      const wy = building.y + 9 + row * ((building.h - 18) / rows);
      if (wx + 6 > building.x + building.w - 7 || wy + 6 > building.y + building.h - 8) continue;
      const lit = night && ((row * 7 + column * 5 + Math.floor(building.seed * 100)) % 9) < 3;
      ctx.fillStyle = lit ? 'rgba(255,224,150,0.85)' : 'rgba(40,58,68,0.55)';
      ctx.fillRect(wx, wy, 6, 7);
    }
  }

  if (!building.sign) return;
  ctx.fillStyle = night ? '#e8b451' : '#30424a';
  ctx.fillRect(building.x + 6, building.y - 12,
    Math.min(building.w - 12, building.sign.length * 11 + 16), 18);
  ctx.fillStyle = night ? '#24323a' : '#f4e8c8';
  ctx.font = `800 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(building.sign, building.x + 14, building.y + 1);
}

function paintVenue(ctx, block, world) {
  if (!block.special) return;
  const style = VENUES[block.special.kind] ?? { color: '#c8a36b', glyph: '•', name: block.special.name };
  const pulse = 0.5 + 0.5 * Math.sin(world.stepHint * 0.045);
  ctx.fillStyle = 'rgba(18,28,34,0.12)';
  ctx.fillRect(block.x + 12, block.y + 12, block.size - 24, block.size - 24);
  ctx.fillStyle = style.color;
  ctx.globalAlpha = 0.22 + pulse * 0.1;
  ctx.beginPath();
  ctx.arc(block.cx, block.cy, 44 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(block.cx, block.cy, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17232b';
  ctx.font = `900 25px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(style.glyph, block.cx, block.cy + 9);
  ctx.font = `800 10px ${FONT}`;
  ctx.fillStyle = 'rgba(24,35,42,0.82)';
  ctx.fillText(style.name, block.cx, block.y + block.size - 8);
}

export function drawBlocks(ctx, world, bounds) {
  for (const block of world.city.blocks) {
    if (!visible(block.cx, block.cy, bounds, block.size)) continue;
    const pad = GRID.sidewalk;
    ctx.fillStyle = COLORS.sidewalk;
    ctx.fillRect(block.x - pad, block.y - pad, block.size + pad * 2, block.size + pad * 2);
    ctx.strokeStyle = COLORS.curb;
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x - pad + 1, block.y - pad + 1,
      block.size + pad * 2 - 2, block.size + pad * 2 - 2);
    ctx.fillStyle = block.type === 'park' ? COLORS.grass : block.type === 'lot' ? '#c3ad86' : '#b8b19a';
    ctx.fillRect(block.x, block.y, block.size, block.size);

    if (block.type === 'park') {
      ctx.strokeStyle = 'rgba(238,222,182,0.6)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(block.x, block.cy);
      ctx.lineTo(block.x + block.size, block.cy);
      ctx.moveTo(block.cx, block.y);
      ctx.lineTo(block.cx, block.y + block.size);
      ctx.stroke();
      for (const tree of block.trees) {
        ctx.fillStyle = COLORS.grassDark;
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, 13 * tree.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7fae67';
        ctx.beginPath();
        ctx.arc(tree.x - 4, tree.y - 4, 8 * tree.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    paintVenue(ctx, block, world);
    for (const building of block.buildings) paintBuilding(ctx, building, world);
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
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI + i * (Math.PI / 5.6);
    const tipX = palm.lean * 58 + Math.cos(angle) * 35;
    const tipY = -80 + Math.sin(angle) * 22;
    ctx.beginPath();
    ctx.moveTo(palm.lean * 58, -80);
    ctx.quadraticCurveTo((palm.lean * 58 + tipX) / 2, -103, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawProps(ctx, world, bounds) {
  for (const palm of world.city.palms) {
    if (visible(palm.x, palm.y, bounds, 60)) paintPalm(ctx, palm);
  }
  for (const prop of world.city.props) {
    if (!visible(prop.x, prop.y, bounds, 20)) continue;
    if (prop.kind === 'bench') {
      ctx.fillStyle = '#8a6844';
      ctx.fillRect(prop.x - 12, prop.y - 4, 24, 7);
      ctx.fillStyle = '#51483d';
      ctx.fillRect(prop.x - 10, prop.y + 3, 3, 6);
      ctx.fillRect(prop.x + 7, prop.y + 3, 3, 6);
    } else {
      ctx.fillStyle = '#4d6b66';
      ctx.fillRect(prop.x - 5, prop.y - 6, 10, 12);
      ctx.fillStyle = '#314b48';
      ctx.fillRect(prop.x - 6, prop.y - 7, 12, 3);
    }
  }
  for (const light of world.city.lights) {
    if (!visible(light.x, light.y, bounds, 20)) continue;
    ctx.fillStyle = '#59646a';
    ctx.fillRect(light.x - 2, light.y - 30, 4, 30);
    ctx.fillStyle = isNight(world) ? '#ffe3a5' : '#cfd4cb';
    ctx.beginPath();
    ctx.arc(light.x, light.y - 31, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const signal of world.city.signals) {
    if (!visible(signal.x, signal.y, bounds, 20)) continue;
    const green = trafficLightGreen(signal, world.time);
    ctx.fillStyle = '#222d33';
    ctx.fillRect(signal.x - 5, signal.y - 32, 10, 26);
    ctx.fillStyle = green ? '#4fd06b' : '#ef5f56';
    ctx.beginPath();
    ctx.arc(signal.x, signal.y - 25, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = green ? '#245a35' : '#632a2a';
    ctx.beginPath();
    ctx.arc(signal.x, signal.y - 15, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintMarker(ctx, marker, world, color) {
  const pulse = 0.5 + 0.5 * Math.sin(world.stepHint * 0.09);
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

export function drawMarkers(ctx, world, bounds) {
  const markers = [];
  if (!world.mission.active && !world.mission.failed && world.storyMarker) {
    markers.push({ ...world.storyMarker, color: '#ffd166' });
  }
  if (world.mission.blip) markers.push({ ...world.mission.blip, color: '#ffb64f' });
  if (world.activity.blip) markers.push({ ...world.activity.blip, color: '#6de2d8' });
  for (const marker of markers) {
    if (visible(marker.x, marker.y, bounds, 120)) paintMarker(ctx, marker, world, marker.color);
  }
}

export function sunWash(ctx, world, bounds) {
  const light = daylight(world);
  if (light > 0.75) return;
  ctx.fillStyle = `rgba(255,174,102,${(0.75 - light) * 0.16})`;
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
}
