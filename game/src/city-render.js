import { COLORS, FONT, FIELD } from './config.js';

function visible(city, camera, padding = 160) {
  return {
    left: camera.x - FIELD.width / 2 - padding,
    right: camera.x + FIELD.width / 2 + padding,
    top: camera.y - FIELD.height / 2 - padding,
    bottom: camera.y + FIELD.height / 2 + padding,
  };
}

function drawGround(ctx, city, view, elapsed) {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
  const beachTop = (city.rows - 1) * city.cell;
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(view.left, beachTop, view.right - view.left, city.shoreY - beachTop);
  ctx.fillStyle = COLORS.waterDeep;
  ctx.fillRect(view.left, city.shoreY, view.right - view.left, view.bottom - city.shoreY + 400);
  const drift = (elapsed * 14) % 64;
  ctx.fillStyle = COLORS.water;
  for (let y = city.shoreY + 14; y < view.bottom + 60; y += 42) {
    const row = Math.round(y / 42);
    for (let x = Math.floor(view.left / 132) * 132 - 132; x < view.right + 132; x += 132) {
      ctx.fillRect(x + drift + (row % 2) * 36, y, 58, 4);
    }
  }
  ctx.fillStyle = COLORS.foam;
  ctx.fillRect(view.left, city.shoreY - 3, view.right - view.left, 6);
  for (let x = Math.floor(view.left / 90) * 90; x < view.right + 90; x += 90) {
    const edge = city.shoreY - 12 - Math.sin(elapsed * 2 + x * 0.02) * 5;
    ctx.fillRect(x, edge, 46, 4);
  }
}

function drawRoads(ctx, city, view) {
  const top = Math.max(view.top, -60);
  const bottom = Math.min(view.bottom, city.shoreY);
  ctx.fillStyle = COLORS.asphalt;
  for (let col = 0; col <= city.cols; col += 1) {
    const x = col * city.cell;
    if (x + city.road / 2 < view.left || x - city.road / 2 > view.right) continue;
    ctx.fillRect(x - city.road / 2, top, city.road, bottom - top);
  }
  for (let row = 0; row <= city.rows; row += 1) {
    const y = row * city.cell;
    if (y > city.shoreY || y + city.road / 2 < view.top || y - city.road / 2 > view.bottom) continue;
    ctx.fillRect(view.left, y - city.road / 2, view.right - view.left, city.road);
  }
  ctx.fillStyle = COLORS.lane;
  for (let col = 0; col <= city.cols; col += 1) {
    const x = col * city.cell;
    if (x + city.road / 2 < view.left || x - city.road / 2 > view.right) continue;
    for (let y = Math.floor(top / 76) * 76; y < bottom; y += 76) {
      if (y % (city.cell * 2) < city.road + 20) continue;
      ctx.fillRect(x - 2, y, 4, 34);
    }
  }
  for (let row = 0; row <= city.rows; row += 1) {
    const y = row * city.cell;
    if (y > city.shoreY || y + city.road / 2 < view.top || y - city.road / 2 > view.bottom) continue;
    for (let x = Math.floor(view.left / 76) * 76; x < view.right; x += 76) {
      if (x % (city.cell * 2) < city.road + 20) continue;
      ctx.fillRect(x, y - 2, 34, 4);
    }
  }
  ctx.fillStyle = COLORS.crosswalk;
  const firstCol = Math.max(0, Math.floor(view.left / city.cell) - 1);
  const lastCol = Math.min(city.cols, Math.ceil(view.right / city.cell));
  const firstRow = Math.max(0, Math.floor(view.top / city.cell) - 1);
  const lastRow = Math.min(city.rows, Math.ceil(view.bottom / city.cell));
  for (let row = firstRow; row <= lastRow; row += 1) {
    const cy = row * city.cell;
    if (cy > city.shoreY) continue;
    for (let col = firstCol; col <= lastCol; col += 1) {
      const cx = col * city.cell;
      for (let stripe = -3; stripe <= 3; stripe += 1) {
        ctx.fillRect(cx - city.road / 2 + 6 + stripe * 11, cy - city.road / 2 - 9, 7, 8);
        ctx.fillRect(cx - city.road / 2 + 6 + stripe * 11, cy + city.road / 2 + 1, 7, 8);
        ctx.fillRect(cx - city.road / 2 - 9, cy - city.road / 2 + 6 + stripe * 11, 8, 7);
        ctx.fillRect(cx + city.road / 2 + 1, cy - city.road / 2 + 6 + stripe * 11, 8, 7);
      }
    }
  }
}

function drawTree(ctx, tree, color) {
  ctx.fillStyle = COLORS.trunk;
  ctx.fillRect(tree.x - 2 * tree.size, tree.y - 2 * tree.size, 4 * tree.size, 5 * tree.size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(tree.x, tree.y - 5 * tree.size, 12 * tree.size, 0, Math.PI * 2);
  ctx.arc(tree.x - 8 * tree.size, tree.y + 3 * tree.size, 9 * tree.size, 0, Math.PI * 2);
  ctx.arc(tree.x + 8 * tree.size, tree.y + 3 * tree.size, 9 * tree.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawPalm(ctx, palm) {
  const size = palm.size;
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(palm.x + 6, palm.y + 5, 15 * size, 7 * size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.trunk;
  ctx.lineWidth = 5 * size;
  ctx.beginPath();
  ctx.moveTo(palm.x, palm.y + 4);
  ctx.lineTo(palm.x + palm.lean * 16, palm.y - 16 * size);
  ctx.stroke();
  ctx.strokeStyle = COLORS.palm;
  ctx.lineWidth = 4 * size;
  const crownX = palm.x + palm.lean * 16;
  const crownY = palm.y - 16 * size;
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3 + palm.lean;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + Math.cos(angle) * 13 * size,
      crownY + Math.sin(angle) * 10 * size - 5 * size,
      crownX + Math.cos(angle) * 22 * size,
      crownY + Math.sin(angle) * 17 * size,
    );
    ctx.stroke();
  }
}

function drawBuilding(ctx, building, night) {
  const shadow = Math.min(18, building.tall * 0.5);
  ctx.fillStyle = COLORS.shadow;
  ctx.fillRect(building.x + shadow, building.y + shadow, building.width, building.height);
  ctx.fillStyle = building.wall;
  ctx.fillRect(building.x, building.y, building.width, building.height);
  ctx.fillStyle = building.roof;
  ctx.fillRect(building.x + 6, building.y + 6, Math.max(4, building.width - 12), Math.max(4, building.height - 12));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(building.x + 6, building.y + 6, Math.max(4, building.width - 12), 5);
  const unitWidth = Math.min(26, building.width * 0.28);
  const unitHeight = Math.min(20, building.height * 0.24);
  ctx.fillStyle = 'rgba(48, 54, 60, 0.55)';
  ctx.fillRect(building.x + 12 + building.detail * 20, building.y + 14, unitWidth, unitHeight);
  ctx.strokeStyle = 'rgba(40, 46, 52, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(building.x + 10, building.y + building.height - 12);
  ctx.lineTo(building.x + building.width - 10, building.y + building.height - 12);
  ctx.stroke();
  if (night) {
    ctx.fillStyle = COLORS.lamp;
    for (let index = 0; index < building.panes; index += 1) {
      const x = building.x + 10 + index * ((building.width - 20) / building.panes);
      const flicker = (index + Math.floor(building.detail * 10)) % 3;
      if (flicker === 0) continue;
      ctx.fillRect(x, building.y + 2, Math.max(4, (building.width - 20) / building.panes - 5), 3);
    }
  }
}

function drawBlock(ctx, block, city, view, night, lampsOut) {
  const bx = block.col * city.cell;
  const by = block.row * city.cell;
  const inset = city.road / 2;
  const lotX = bx + inset + 16;
  const lotY = by + inset + 16;
  const span = city.cell - city.road - 32;
  if (bx + city.cell < view.left || bx > view.right || by + city.cell < view.top || by > view.bottom) return;
  ctx.fillStyle = COLORS.sidewalk;
  ctx.fillRect(bx + inset, by + inset, city.cell - city.road, city.cell - city.road);
  ctx.fillStyle = block.park ? COLORS.park : COLORS.lawn;
  ctx.fillRect(lotX, lotY, span, span);
  if (block.park) {
    ctx.fillStyle = COLORS.sidewalk;
    ctx.fillRect(lotX + span * 0.45, lotY, span * 0.1, span);
    ctx.fillRect(lotX, lotY + span * 0.45, span, span * 0.1);
  }
  for (let index = 0; index < block.buildings.length; index += 1) {
    const building = block.buildings[index];
    if (building.x > view.right || building.x + building.width < view.left) continue;
    if (building.y > view.bottom || building.y + building.height < view.top) continue;
    drawBuilding(ctx, building, night);
  }
  for (let index = 0; index < block.trees.length; index += 1) drawTree(ctx, block.trees[index], COLORS.tree);
  for (let index = 0; index < block.palms.length; index += 1) drawPalm(ctx, block.palms[index]);
  for (let index = 0; index < block.benches.length; index += 1) {
    const bench = block.benches[index];
    ctx.fillStyle = COLORS.trunk;
    ctx.fillRect(bench.x - 12, bench.y - 4, 24, 8);
  }
  for (let index = 0; index < block.lamps.length; index += 1) {
    const lamp = block.lamps[index];
    if (lamp.x < view.left - 60 || lamp.x > view.right + 60 || lamp.y < view.top - 60 || lamp.y > view.bottom + 60) continue;
    ctx.fillStyle = COLORS.curb;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (night) {
      const glow = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 74);
      glow.addColorStop(0, 'rgba(255, 231, 158, 0.42)');
      glow.addColorStop(1, 'rgba(255, 231, 158, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 74, 0, Math.PI * 2);
      ctx.fill();
      lampsOut.push(lamp);
    }
  }
}

export function drawCity(ctx, city, camera, environment, elapsed) {
  const view = visible(city, camera);
  const night = environment.night;
  drawGround(ctx, city, view, elapsed);
  drawRoads(ctx, city, view);
  const lamps = [];
  const firstCol = Math.max(0, Math.floor(view.left / city.cell) - 1);
  const lastCol = Math.min(city.cols - 1, Math.ceil(view.right / city.cell));
  const firstRow = Math.max(0, Math.floor(view.top / city.cell) - 1);
  const lastRow = Math.min(city.rows - 1, Math.ceil(view.bottom / city.cell));
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
      drawBlock(ctx, city.blocks[row * city.cols + col], city, view, night, lamps);
    }
  }
  ctx.font = `600 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const seen = new Set();
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
      const block = city.blocks[row * city.cols + col];
      if (seen.has(block.name)) continue;
      seen.add(block.name);
      const x = block.x + city.cell / 2;
      const y = block.y + city.cell / 2;
      if (x < view.left || x > view.right || y < view.top || y > view.bottom) continue;
      ctx.fillStyle = night ? 'rgba(226, 235, 255, 0.28)' : 'rgba(38, 52, 60, 0.24)';
      ctx.fillText(block.name.toUpperCase(), x, y);
    }
  }
  return lamps;
}
