import { BUILDING_COLORS, COLORS, GRID, WORLD } from './config.js';
import { chance, clamp, createRandom, hashSeed, integer, pick, range } from './random.js';

const DISTRICTS = [
  { name: 'Old Town', inside: (x, y) => x < 940 && y < 1320 },
  { name: 'Industrial', inside: (x, y) => x < 1120 && y >= 1320 },
  { name: 'Downtown', inside: (x, y) => x >= 940 && x < 2060 && y >= 700 && y < 1740 },
  { name: 'Marina', inside: (x, y) => x >= 1900 && x < 2900 && y >= 1740 },
  { name: 'Palmside', inside: (x, y) => x >= 2780 || (x >= 1900 && y < 700) },
  { name: 'Suburbs', inside: () => true },
];

const LANDMARKS = {
  '2,3': { kind: 'rampage', name: 'Rooftop Range' },
  '2,8': { kind: 'spray', name: 'Misty Bay Paint & Body' },
  '4,4': { kind: 'taxi', name: 'Sunfare Cab Stand' },
  '5,7': { kind: 'garage', name: 'Sombra Motors' },
  '6,4': { kind: 'cafe', name: 'Cafe Coral' },
  '6,5': { kind: 'hospital', name: 'Solara General' },
  '7,6': { kind: 'police', name: 'Bay Precinct' },
  '10,9': { kind: 'delivery', name: 'Harbor Depot' },
  '11,10': { kind: 'yacht', name: 'Golden Horn Club' },
  '13,4': { kind: 'safehouse', name: 'Palm Terrace' },
};

const HORIZONTAL_STREETS = [
  'Seabreeze Lane', 'Old Mill Road', 'Alameda Avenue', 'Sunset Row',
  'Coral Boulevard', 'Market Street', 'Palm Walk', 'Harbor Way',
  'Foundry Street', 'Bayview Drive', 'Marina Parade', 'Breakwater Road',
];

const VERTICAL_STREETS = [
  'West Quay', 'Copper Street', 'Cedar Avenue', 'Sunfare Street', 'Linden Road',
  'Central Avenue', 'Granite Way', 'Citrus Boulevard', 'Esplanade', 'Dolphin Drive',
  'Palm Grove Road', 'East Point Road', 'Seagull Avenue', 'Marlin Street',
  'Lagoon Road', 'Lighthouse Road',
];

export function districtAt(x, y) {
  for (const district of DISTRICTS) {
    if (district.inside(x, y)) return district.name;
  }
  return 'Solara Bay';
}

export function streetName(axis, index) {
  const names = axis === 'h' ? HORIZONTAL_STREETS : VERTICAL_STREETS;
  const wrapped = ((index % names.length) + names.length) % names.length;
  return names[wrapped];
}

function nearestLine(value, count) {
  const index = clamp(Math.round((value - GRID.first) / GRID.step), 0, count - 1);
  const line = GRID.first + index * GRID.step;
  return { index, line, distance: Math.abs(value - line) };
}

export function isRoad(x, y, margin = 0) {
  if (x < 0 || y < 0 || x > WORLD.width || y > WORLD.height) return false;
  const column = nearestLine(x, GRID.columns);
  const row = nearestLine(y, GRID.rows);
  const half = GRID.road / 2 + margin;
  return column.distance <= half || row.distance <= half;
}

export function isWater(x, y) {
  return y > WORLD.waterY || x < 0 || x > WORLD.width || y < 0 || y > WORLD.height;
}

export function nearestRoad(x, y) {
  const column = nearestLine(x, GRID.columns);
  const row = nearestLine(y, GRID.rows);
  if (column.distance <= row.distance) {
    return { axis: 'v', line: column.line, index: column.index, distance: column.distance };
  }
  return { axis: 'h', line: row.line, index: row.index, distance: row.distance };
}

export function nearestIntersection(x, y) {
  const column = nearestLine(x, GRID.columns);
  const row = nearestLine(y, GRID.rows);
  return { x: column.line, y: row.line, col: column.index, row: row.index };
}

export function laneOffset(axis, direction) {
  return direction * (GRID.road / 4) * (axis === 'h' ? 1 : -1);
}

export function roadPosition(axis, line, along, direction) {
  const offset = laneOffset(axis, direction);
  if (axis === 'h') return { x: along, y: line + offset };
  return { x: line + offset, y: along };
}

export function trafficLightGreen(light, time) {
  const offset = light.axis === 'v' ? 1 : 0;
  return (Math.floor(time / 4) + light.col + light.row + offset) % 2 === 0;
}

function blockBounds(col, row) {
  const pad = GRID.road / 2 + GRID.sidewalk;
  const x = GRID.first + col * GRID.step + pad;
  const y = GRID.first + row * GRID.step + pad;
  const size = GRID.step - GRID.road - GRID.sidewalk * 2;
  return { x, y, size, cx: x + size / 2, cy: y + size / 2 };
}

function makeBuilding(random, bounds, district, kind) {
  const isTowerPiece = district === 'Downtown' && kind === 'full' && chance(random, 0.58);
  const width = isTowerPiece ? bounds.size - 8 : Math.min(bounds.size / 2 - 6, range(random, 48, 74));
  const height = isTowerPiece ? bounds.size - 8 : Math.min(bounds.size / 2 - 6, range(random, 44, 72));
  let floors;
  if (district === 'Downtown') floors = integer(random, isTowerPiece ? 7 : 4, isTowerPiece ? 13 : 8);
  else if (district === 'Industrial') floors = integer(random, 1, 3);
  else floors = integer(random, 2, 5);
  return {
    x: bounds.x + range(random, 3, Math.max(4, bounds.size - width - 3)),
    y: bounds.y + range(random, 3, Math.max(4, bounds.size - height - 3)),
    w: width,
    h: height,
    floors,
    color: pick(random, BUILDING_COLORS),
    roof: chance(random, 0.35) ? '#8b8d84' : '#b7a894',
    style: district === 'Industrial' ? 'warehouse' : floors > 5 ? 'tower' : 'shop',
    trim: chance(random, 0.5) ? '#f0e3c2' : '#7d7469',
    seed: random(),
    sign: chance(random, 0.22) ? pick(random, ['BAY', 'SUN', 'CORAL', 'PIER', 'NOVA', 'MIST']) : '',
  };
}

function choosePalmSpots(random, block, district, count) {
  const spots = [];
  for (let i = 0; i < count; i += 1) {
    if (block.type === 'park') continue;
    spots.push({
      x: block.x - 10 + random() * (block.size + 20),
      y: i === 0 ? block.y - 11 : block.y + block.size + 11,
      scale: range(random, 0.8, district === 'Palmside' ? 1.35 : 1.25),
      lean: range(random, -0.16, 0.16),
    });
  }
  return spots;
}

function makeBlock(random, col, row) {
  const bounds = blockBounds(col, row);
  const district = districtAt(bounds.cx, bounds.cy);
  const special = LANDMARKS[`${col},${row}`] ?? null;
  const block = {
    col,
    row,
    ...bounds,
    district,
    special,
    type: 'built',
    buildings: [],
    trees: [],
    details: [],
    slots: [],
  };

  if (special !== null) {
    if (special.kind === 'rampage') block.buildings.push(makeBuilding(random, bounds, district, 'full'));
    else block.type = 'plaza';
    return block;
  }

  const parkRate = district === 'Palmside' ? 0.22 : district === 'Suburbs' ? 0.2 : district === 'Downtown' ? 0.05 : 0.04;
  const lotRate = district === 'Industrial' ? 0.2 : district === 'Downtown' ? 0.13 : 0.07;
  const roll = random();

  if (roll < parkRate) {
    block.type = 'park';
    for (let i = 0; i < 4; i += 1) {
      block.trees.push({
        x: bounds.x + range(random, 12, bounds.size - 12),
        y: bounds.y + range(random, 12, bounds.size - 12),
        scale: range(random, 0.85, 1.3),
      });
    }
    return block;
  }

  if (roll < parkRate + lotRate) {
    block.type = 'lot';
    for (let i = 0; i < 5; i += 1) block.slots.push(bounds.x + 12 + i * 24);
    if (chance(random, 0.5)) {
      block.buildings.push(makeBuilding(random, { ...bounds, size: bounds.size * 0.45 }, district, 'corner'));
    }
    return block;
  }

  if (chance(random, 0.45) && district !== 'Industrial') {
    block.buildings.push(makeBuilding(random, bounds, district, 'full'));
    return block;
  }

  for (let quadrant = 0; quadrant < 4; quadrant += 1) {
    const rate = district === 'Downtown' ? 0.88 : district === 'Industrial' ? 0.6 : 0.76;
    if (!chance(random, rate)) continue;
    const piece = {
      x: bounds.x + (quadrant % 2) * bounds.size / 2,
      y: bounds.y + Math.floor(quadrant / 2) * bounds.size / 2,
      size: bounds.size / 2,
    };
    block.buildings.push(makeBuilding(random, piece, district, 'quadrant'));
  }
  return block;
}

export function createCity(seed) {
  const random = createRandom(seed ^ 0x5eed);
  const blocks = [];
  const grid = [];
  const buildings = [];
  const lights = [];
  const signals = [];
  const palms = [];
  const props = [];
  const shops = [];

  for (let row = 0; row < GRID.rows - 1; row += 1) {
    const line = [];
    for (let col = 0; col < GRID.columns - 1; col += 1) {
      const block = makeBlock(random, col, row);
      block.index = blocks.length;
      blocks.push(block);
      line.push(block);
      buildings.push(...block.buildings);
      if (block.special) {
        shops.push({ ...block.special, x: block.cx, y: block.cy, col, row });
      }
      const district = districtAt(block.cx, block.cy);
      const palmCount = block.type === 'park' ? block.trees.length : district === 'Palmside' ? 2 : 1;
      palms.push(...choosePalmSpots(random, block, district, palmCount));
      if (chance(random, 0.45)) {
        props.push({
          kind: chance(random, 0.5) ? 'bench' : 'bin',
          x: block.x + range(random, 8, block.size - 8),
          y: block.y + block.size + 9,
          angle: 0,
        });
      }
    }
    grid.push(line);
  }

  for (let col = 0; col < GRID.columns; col += 1) {
    for (let row = 0; row < GRID.rows; row += 1) {
      const x = GRID.first + col * GRID.step;
      const y = GRID.first + row * GRID.step;
      const pattern = hashSeed(seed, col, row);
      lights.push({ x: x + 20, y: y + 20, warm: pattern % 3 === 0 });
      lights.push({ x: x - 20, y: y - 20, warm: pattern % 5 === 0 });
      signals.push({
        x: x + 30,
        y: y + 30,
        col,
        row,
        axis: pattern % 2 === 0 ? 'h' : 'v',
        phase: pattern % 4,
      });
    }
  }

  for (let i = 0; i < 46; i += 1) {
    palms.push({
      x: range(random, 60, WORLD.width - 60),
      y: range(random, WORLD.beachY + 8, WORLD.waterY - 12),
      scale: range(random, 0.95, 1.5),
      lean: range(random, -0.2, 0.2),
    });
  }

  return { seed, blocks, grid, buildings, lights, signals, palms, props, shops };
}

export function blockAt(city, x, y) {
  const col = Math.floor((x - GRID.first) / GRID.step);
  const row = Math.floor((y - GRID.first) / GRID.step);
  if (col < 0 || row < 0 || col >= GRID.columns - 1 || row >= GRID.rows - 1) return null;
  return city.grid[row][col];
}

export function pointInBuilding(city, x, y) {
  const block = blockAt(city, x, y);
  if (block === null) return null;
  for (const building of block.buildings) {
    if (x >= building.x && x <= building.x + building.w && y >= building.y && y <= building.y + building.h) {
      return building;
    }
  }
  return null;
}

function pushOutsideBuilding(x, y, radius, building) {
  const nearestX = clamp(x, building.x, building.x + building.w);
  const nearestY = clamp(y, building.y, building.y + building.h);
  let dx = x - nearestX;
  let dy = y - nearestY;
  const squared = dx * dx + dy * dy;
  if (squared >= radius * radius) return { x, y, hit: false };

  if (squared < 0.0001) {
    const options = [
      { amount: Math.abs(x - building.x), x: building.x - radius, y: building.y + building.h / 2 },
      { amount: Math.abs(building.x + building.w - x), x: building.x + building.w + radius, y: building.y + building.h / 2 },
      { amount: Math.abs(y - building.y), x: building.x + building.w / 2, y: building.y - radius },
      { amount: Math.abs(building.y + building.h - y), x: building.x + building.w / 2, y: building.y + building.h + radius },
    ];
    options.sort((a, b) => a.amount - b.amount);
    return { x: options[0].x, y: options[0].y, hit: true };
  }

  const length = Math.sqrt(squared);
  dx /= length;
  dy /= length;
  return { x: nearestX + dx * radius, y: nearestY + dy * radius, hit: true };
}

export function resolveCircle(city, x, y, radius) {
  let hit = false;
  const baseCol = Math.floor((x - GRID.first) / GRID.step);
  const baseRow = Math.floor((y - GRID.first) / GRID.step);
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      const col = baseCol + colOffset;
      const row = baseRow + rowOffset;
      if (col < 0 || row < 0 || col >= GRID.columns - 1 || row >= GRID.rows - 1) continue;
      for (const building of city.grid[row][col].buildings) {
        const resolved = pushOutsideBuilding(x, y, radius, building);
        x = resolved.x;
        y = resolved.y;
        hit = hit || resolved.hit;
      }
    }
  }
  if (x < radius) { x = radius; hit = true; }
  if (x > WORLD.width - radius) { x = WORLD.width - radius; hit = true; }
  if (y < radius) { y = radius; hit = true; }
  const shore = WORLD.waterY - radius - 6;
  if (y > shore) { y = shore; hit = true; }
  return { x, y, hit };
}

export function lineBlocked(city, x1, y1, x2, y2) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const samples = Math.max(1, Math.floor(length / 10));
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples;
    if (pointInBuilding(city, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return true;
  }
  return false;
}

export function shopAt(city, kind) {
  return city.shops.find((shop) => shop.kind === kind) ?? null;
}

export function randomRoadPoint(city, random, axis = null) {
  const direction = chance(random, 0.5) ? 1 : -1;
  const chosen = axis ?? (chance(random, 0.5) ? 'h' : 'v');
  if (chosen === 'h') {
    const line = GRID.first + integer(random, 0, GRID.rows - 1) * GRID.step;
    return roadPosition('h', line, range(random, 60, WORLD.width - 60), direction);
  }
  const line = GRID.first + integer(random, 0, GRID.columns - 1) * GRID.step;
  return roadPosition('v', line, range(random, 60, WORLD.waterY - 60), direction);
}

export function sidewalkPoint(city, random) {
  const block = pick(random, city.blocks);
  const side = integer(random, 0, 3);
  const along = range(random, 8, block.size - 8);
  if (side === 0) return { x: block.x + along, y: block.y - 10 };
  if (side === 1) return { x: block.x + block.size + 10, y: block.y + along };
  if (side === 2) return { x: block.x + along, y: block.y + block.size + 10 };
  return { x: block.x - 10, y: block.y + along };
}

export function buildingColor(city, x, y) {
  const block = blockAt(city, x, y);
  if (block === null || block.buildings.length === 0) return COLORS.sand;
  return block.buildings[0].color;
}
