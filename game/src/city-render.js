// Drawing for the static city. The camera transform is already active when these functions run,
// so all coordinates are world pixels. Only the cells around the viewport are visited; the rest of
// the map costs nothing. The day/night object decides water colour, shadow strength and lamplight.
import { CITY, COLORS, FACADES, VIEW } from './config.js';
import { hashCell } from './random.js';

function rect(context, color, x, y, width, height) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function circle(context, color, x, y, radius) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/** Traffic lights alternate on a fixed beat so drivers and pedestrians can share the rule later. */
export function trafficLightPhase(column, row, elapsed) {
  return Math.floor(elapsed / 6 + (column + row) * 0.5) % 2 === 0 ? 'go' : 'stop';
}

function drawWater(context, x, y, size, city, cell, environment, now) {
  rect(context, environment.water(), x, y, size, size);
  const variation = hashCell(city.seed, cell.column, cell.row, 12) % 4;
  if (variation === 0) rect(context, COLORS.waterDeep, x, y + size * 0.6, size, size * 0.4);
  context.strokeStyle = `rgba(235, 251, 248, ${0.18 + environment.state.daylight * 0.12})`;
  context.lineWidth = 1.5;
  for (let line = 0; line < 3; line += 1) {
    const baseY = y + 18 + line * 32 + (variation % 3) * 7;
    const shift = Math.sin(now * 1.6 + cell.column * 1.3 + cell.row * 0.7 + line) * 9;
    const startX = x + 8 + shift;
    if (startX + 48 > x + size) continue;
    context.beginPath();
    context.moveTo(startX, baseY);
    context.quadraticCurveTo(startX + 16, baseY - 4, startX + 34, baseY);
    context.stroke();
  }
}

function drawRoads(context, cell, x, y, size, environment) {
  const road = CITY.road;
  const half = road / 2;
  const shade = environment.state.daylight > 0.4 ? COLORS.roadShade : '#2b3038';
  rect(context, shade, x, y, size, road);
  rect(context, shade, x, y, road, size);
  rect(context, COLORS.road, x + 2, y + 2, size - 4, road - 4);
  rect(context, COLORS.road, x + 2, y + 2, road - 4, size - 4);

  if (environment.state.daylight > 0.28) {
    rect(context, COLORS.lane, x + 6, y + half - 1, size - 12, 2);
    rect(context, COLORS.lane, x + half - 1, y + 6, 2, size - 12);
    for (let dash = 0; dash < 4; dash += 1) {
      const along = x + 12 + dash * 30;
      rect(context, COLORS.lane, along, y + half - 1, 13, 2);
      rect(context, COLORS.lane, x + half - 1, y + 12 + dash * 30, 2, 13);
    }
  }

  rect(context, COLORS.curb, x + road + 1, y + road + 1, size - road - 2, 3);
  rect(context, COLORS.curb, x + road + 1, y + road + 1, 3, size - road - 2);

  for (let stripe = 0; stripe < 4; stripe += 1) {
    rect(context, COLORS.crosswalk, x + road + 6 + stripe * 7, y + 3, 4, road - 6);
    rect(context, COLORS.crosswalk, x + 3, y + road + 6 + stripe * 7, road - 6, 4);
  }
}

function drawBuilding(context, building, cell, environment) {
  const walls = FACADES[cell.style] ?? FACADES.palm;
  const wall = walls[building.wall % walls.length];
  const shadow = environment.shadowAlpha();
  const lift = Math.min(12, building.storeys * 2);
  const bx = building.x;
  const by = building.y;
  const width = building.width;
  const height = building.height;

  context.fillStyle = `rgba(20, 25, 34, ${shadow})`;
  context.fillRect(bx + 6, by + 7, width + lift, height + lift);
  rect(context, '#7c7165', bx, by, width, height);
  rect(context, wall, bx + 2, by + 2, width - 4, height - 4);
  rect(context, 'rgba(255,255,255,0.13)', bx + 2, by + 2, width - 4, 5);
  rect(context, 'rgba(0,0,0,0.12)', bx + width - 7, by + 2, 5, height - 4);

  if (building.roof === 'gable') {
    context.fillStyle = '#8d6253';
    context.beginPath();
    context.moveTo(bx + 1, by + 4);
    context.lineTo(bx + width / 2, by - 7);
    context.lineTo(bx + width - 1, by + 4);
    context.closePath();
    context.fill();
    rect(context, 'rgba(255,255,255,0.18)', bx + 4, by + 6, width - 8, 3);
  } else if (building.roof === 'step') {
    rect(context, 'rgba(255,255,255,0.16)', bx + 8, by + 8, width - 16, 6);
    rect(context, 'rgba(0,0,0,0.16)', bx + 14, by + 18, width - 28, 6);
  } else if (building.roof === 'terrace') {
    rect(context, 'rgba(255,255,255,0.15)', bx + 5, by + 5, width - 10, 4);
    circle(context, '#6d9c6d', bx + width - 12, by + 12, 4);
  } else {
    rect(context, 'rgba(255,255,255,0.13)', bx + 7, by + 7, width - 14, 4);
    rect(context, '#6f7f84', bx + width * 0.22, by + height * 0.3, Math.max(6, width * 0.2), Math.max(5, height * 0.18));
  }

  const windowColor = environment.state.night > 0.35 ? COLORS.window : '#9dc0cb';
  const columns = Math.max(1, Math.floor((width - 8) / 13));
  const rows = Math.max(1, Math.floor((height - 10) / 14));
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const bit = (building.detail >> ((row * 5 + column) % 24)) & 1;
      if (environment.state.night > 0.35 && bit === 0) continue;
      const wx = bx + 6 + column * 13;
      const wy = by + 9 + row * 14;
      rect(context, bit ? windowColor : COLORS.windowDark, wx, wy, 7, 8);
      rect(context, 'rgba(255,255,255,0.22)', wx, wy, 7, 2);
    }
  }

  if (building.landmark) {
    rect(context, 'rgba(20, 34, 49, 0.82)', bx + 3, by + height - 13, Math.min(width - 6, building.landmark.length * 5 + 8), 11);
    context.fillStyle = '#f4e4b6';
    context.font = '9px system-ui, sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(building.landmark, bx + 7, by + height - 7);
  }
}

function drawProp(context, prop, environment, now) {
  if (prop.type === 'palm') {
    const sway = Math.sin(now * 1.1 + prop.x * 0.05) * 1.6;
    rect(context, COLORS.trunk, prop.x - 2, prop.y - prop.size * 0.7, 4, prop.size * 0.9);
    circle(context, COLORS.palmDark, prop.x + sway, prop.y - prop.size * 0.8, prop.size * 0.55);
    circle(context, COLORS.palm, prop.x + sway - 3, prop.y - prop.size, prop.size * 0.38);
    circle(context, COLORS.palm, prop.x + sway + 4, prop.y - prop.size * 0.75, prop.size * 0.35);
    circle(context, '#c9a86b', prop.x + sway, prop.y - prop.size * 0.72, 2.5);
  } else if (prop.type === 'tree') {
    circle(context, 'rgba(20,25,34,0.16)', prop.x + 3, prop.y + 3, prop.size);
    circle(context, COLORS.palmDark, prop.x, prop.y, prop.size);
    circle(context, COLORS.palm, prop.x - prop.size * 0.25, prop.y - prop.size * 0.2, prop.size * 0.7);
  } else if (prop.type === 'bench') {
    rect(context, '#6f5841', prop.x, prop.y, prop.size, 5);
    rect(context, '#8b6b47', prop.x + 2, prop.y - 5, prop.size - 4, 4);
  } else if (prop.type === 'lamp') {
    const glow = environment.state.night;
    if (glow > 0.05) {
      const gradient = context.createRadialGradient(prop.x, prop.y - 26, 2, prop.x, prop.y - 26, 62);
      gradient.addColorStop(0, `rgba(255, 221, 142, ${glow * 0.34})`);
      gradient.addColorStop(1, 'rgba(255, 221, 142, 0)');
      context.fillStyle = gradient;
      context.fillRect(prop.x - 62, prop.y - 88, 124, 124);
    }
    rect(context, '#59616a', prop.x - 2, prop.y - 26, 4, 26);
    circle(context, environment.state.night > 0.3 ? COLORS.lamp : '#aab7b8', prop.x, prop.y - 28, 4);
  } else if (prop.type === 'light') {
    rect(context, '#48515a', prop.x - 2, prop.y - 20, 4, 20);
    const go = trafficLightPhase(prop.column, prop.row, now);
    circle(context, go === 'go' ? '#63dd78' : '#6a403d', prop.x, prop.y - 22, 4);
    circle(context, go === 'stop' ? '#ff6855' : '#5b3535', prop.x, prop.y - 13, 3);
  }
}

/** Paint the ground, streets, buildings and furniture visible around the camera centre. */
export function drawCity(context, city, camera, environment, now) {
  const margin = 160;
  const size = city.cellSize;
  const left = camera.x - VIEW.width / 2 - margin;
  const right = camera.x + VIEW.width / 2 + margin;
  const top = camera.y - VIEW.height / 2 - margin;
  const bottom = camera.y + VIEW.height / 2 + margin;
  const firstColumn = Math.max(0, Math.floor(left / size));
  const lastColumn = Math.min(city.grid - 1, Math.floor(right / size));
  const firstRow = Math.max(0, Math.floor(top / size));
  const lastRow = Math.min(city.grid - 1, Math.floor(bottom / size));

  rect(context, COLORS.grass, left, top, right - left, bottom - top);

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const cell = city.cells[row * city.grid + column];
      const x = column * size;
      const y = row * size;
      if (cell.terrain === 'water') {
        drawWater(context, x, y, size, city, cell, environment, now);
        continue;
      }
      rect(context, cell.terrain === 'sand' ? COLORS.sand : cell.park ? COLORS.park : COLORS.grass, x, y, size, size);
      if (cell.terrain === 'sand') rect(context, COLORS.wetSand, x, y + size - 16, size, 16);
      drawRoads(context, cell, x, y, size, environment);
    }
  }

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const cell = city.cells[row * city.grid + column];
      for (let index = 0; index < cell.buildings.length; index += 1) drawBuilding(context, cell.buildings[index], cell, environment);
      for (let index = 0; index < cell.props.length; index += 1) drawProp(context, cell.props[index], environment, now);
      if (cell.terrain !== 'water' && hashCell(city.seed, column, row, 8) % 5 === 0) {
        drawProp(context, { type: 'lamp', x: column * size + CITY.road + 5, y: row * size + CITY.road + 5 }, environment, now);
      }
      if (cell.terrain !== 'water' && hashCell(city.seed, column, row, 9) % 3 === 0) {
        drawProp(context, { type: 'light', column, row, x: column * size + size - 6, y: row * size + size - 6 }, environment, now);
      }
    }
  }
}
