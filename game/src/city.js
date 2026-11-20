import { MAP, PALETTE, ROOF_COLORS } from './config.js';
import { between, choose, limit, makeRandom, mixSeed, odds, whole } from './random.js';

const AREAS = [
  { name: 'Old Quarter', test: (x, y) => x < 940 && y < 1320 },
  { name: 'Foundry Flats', test: (x, y) => x < 1120 && y >= 1320 },
  { name: 'Downtown', test: (x, y) => x >= 940 && x < 2060 && y >= 700 && y < 1740 },
  { name: 'Marina', test: (x, y) => x >= 1900 && x < 2900 && y >= 1740 },
  { name: 'Palmside', test: (x, y) => x >= 2780 || (x >= 1900 && y < 700) },
  { name: 'Suburbs', test: () => true },
];

const VENUES = {
  '2,2': { kind: 'rampage', label: 'Neon Range' },
  '2,8': { kind: 'spray', label: 'Hushcoat Body Shop' },
  '4,4': { kind: 'taxi', label: 'Sunfare Stand' },
  '5,7': { kind: 'garage', label: 'Vesper Motors' },
  '6,4': { kind: 'cafe', label: 'Cafe Astra' },
  '6,5': { kind: 'hospital', label: 'Bayview Clinic' },
  '7,6': { kind: 'police', label: 'Precinct Nine' },
  '10,9': { kind: 'delivery', label: 'Harbor Depot' },
  '11,10': { kind: 'yacht', label: 'Azure Lantern' },
  '13,4': { kind: 'safehouse', label: 'Palm Vista' },
};

const EAST_WEST = [
  'Breezeway Lane', 'Millstone Road', 'Alameda Walk', 'Sunset Row',
  'Coral Boulevard', 'Market Street', 'Palm Promenade', 'Harbor Way',
  'Furnace Street', 'Bayview Drive', 'Marina Parade', 'Breakwater Road',
];

const NORTH_SOUTH = [
  'West Quay', 'Copper Street', 'Cedar Avenue', 'Sunfare Street', 'Linden Road',
  'Central Avenue', 'Granite Way', 'Citrus Boulevard', 'Esplanade', 'Dolphin Drive',
  'Palm Grove Road', 'East Point Road', 'Seagull Avenue', 'Marlin Street',
  'Lagoon Road', 'Lighthouse Road',
];

export function districtAt(x, y) {
  const found = AREAS.find((area) => area.test(x, y));
  return found ? found.name : 'Solara Bay';
}

export function streetAt(axis, index) {
  const names = axis === 'h' ? EAST_WEST : NORTH_SOUTH;
  return names[((index % names.length) + names.length) % names.length];
}

function closestLine(value, count) {
  const index = limit(Math.round((value - MAP.first) / MAP.step), 0, count - 1);
  const line = MAP.first + index * MAP.step;
  return { index, line, offset: Math.abs(value - line) };
}

export function onRoad(x, y, extra = 0) {
  if (x < 0 || y < 0 || x > MAP.width || y > MAP.height) return false;
  const vertical = closestLine(x, MAP.columns);
  const horizontal = closestLine(y, MAP.rows);
  const half = MAP.road / 2 + extra;
  return vertical.offset <= half || horizontal.offset <= half;
}

export function inSea(x, y) {
  return y > MAP.seaLine || x < 0 || x > MAP.width || y < 0 || y > MAP.height;
}

export function closestLane(x, y) {
  const vertical = closestLine(x, MAP.columns);
  const horizontal = closestLine(y, MAP.rows);
  if (vertical.offset <= horizontal.offset) {
    return { axis: 'v', line: vertical.line, index: vertical.index, offset: vertical.offset };
  }
  return { axis: 'h', line: horizontal.line, index: horizontal.index, offset: horizontal.offset };
}

export function junctionAt(x, y) {
  const vertical = closestLine(x, MAP.columns);
  const horizontal = closestLine(y, MAP.rows);
  return { x: vertical.line, y: horizontal.line, col: vertical.index, row: horizontal.index };
}

export function laneShift(axis, direction) {
  return direction * (MAP.road / 4) * (axis === 'h' ? 1 : -1);
}

export function lanePoint(axis, line, along, direction) {
  const shift = laneShift(axis, direction);
  return axis === 'h'
    ? { x: along, y: line + shift }
    : { x: line + shift, y: along };
}

export function signalGreen(signal, time) {
  const skew = signal.axis === 'v' ? 1 : 0;
  return (Math.floor(time / 4) + signal.col + signal.row + skew) % 2 === 0;
}

function blockFrame(col, row) {
  const inset = MAP.road / 2 + MAP.walk;
  const x = MAP.first + col * MAP.step + inset;
  const y = MAP.first + row * MAP.step + inset;
  const size = MAP.step - MAP.road - MAP.walk * 2;
  return { x, y, size, cx: x + size / 2, cy: y + size / 2 };
}

function makeStructure(rng, frame, area, fill) {
  const tower = area === 'Downtown' && fill === 'all' && odds(rng, 0.58);
  const width = tower ? frame.size - 8 : Math.min(frame.size / 2 - 6, between(rng, 48, 74));
  const height = tower ? frame.size - 8 : Math.min(frame.size / 2 - 6, between(rng, 44, 72));
  let levels;
  if (area === 'Downtown') levels = whole(rng, tower ? 7 : 4, tower ? 13 : 8);
  else if (area === 'Foundry Flats') levels = whole(rng, 1, 3);
  else levels = whole(rng, 2, 5);
  return {
    x: frame.x + between(rng, 3, Math.max(4, frame.size - width - 3)),
    y: frame.y + between(rng, 3, Math.max(4, frame.size - height - 3)),
    w: width,
    h: height,
    levels,
    wall: choose(rng, ROOF_COLORS),
    roof: odds(rng, 0.35) ? '#8d8e86' : '#b9aa96',
    form: area === 'Foundry Flats' ? 'shed' : levels > 5 ? 'tower' : 'shop',
    edge: odds(rng, 0.5) ? '#f2e5c6' : '#7e756b',
    grain: rng(),
    board: odds(rng, 0.22) ? choose(rng, ['SOL', 'PIER', 'CORAL', 'NOVA', 'MIST', 'BAY']) : '',
  };
}

function makeLot(rng, col, row) {
  const frame = blockFrame(col, row);
  const area = districtAt(frame.cx, frame.cy);
  const special = VENUES[`${col},${row}`] ?? null;
  const plot = {
    col, row, ...frame, area, special,
    kind: 'built', index: 0,
    structures: [], greenery: [], bays: [],
  };

  if (special) {
    if (special.kind === 'rampage') plot.structures.push(makeStructure(rng, frame, area, 'all'));
    else plot.kind = 'plaza';
    return plot;
  }

  const parkChance = area === 'Palmside' ? 0.22 : area === 'Suburbs' ? 0.2 : area === 'Downtown' ? 0.05 : 0.04;
  const emptyChance = area === 'Foundry Flats' ? 0.2 : area === 'Downtown' ? 0.13 : 0.07;
  const roll = rng();

  if (roll < parkChance) {
    plot.kind = 'park';
    for (let i = 0; i < 4; i += 1) {
      plot.greenery.push({
        x: frame.x + between(rng, 12, frame.size - 12),
        y: frame.y + between(rng, 12, frame.size - 12),
        scale: between(rng, 0.85, 1.3),
      });
    }
    return plot;
  }

  if (roll < parkChance + emptyChance) {
    plot.kind = 'lot';
    for (let i = 0; i < 5; i += 1) plot.bays.push(frame.x + 12 + i * 24);
    if (odds(rng, 0.5)) {
      plot.structures.push(makeStructure(rng, { ...frame, size: frame.size * 0.45 }, area, 'corner'));
    }
    return plot;
  }

  if (odds(rng, 0.45) && area !== 'Foundry Flats') {
    plot.structures.push(makeStructure(rng, frame, area, 'all'));
    return plot;
  }

  const density = area === 'Downtown' ? 0.88 : area === 'Foundry Flats' ? 0.6 : 0.76;
  for (let quadrant = 0; quadrant < 4; quadrant += 1) {
    if (!odds(rng, density)) continue;
    const piece = {
      x: frame.x + (quadrant % 2) * frame.size / 2,
      y: frame.y + Math.floor(quadrant / 2) * frame.size / 2,
      size: frame.size / 2,
    };
    plot.structures.push(makeStructure(rng, piece, area, 'quarter'));
  }
  return plot;
}

function pavementPalms(rng, plot, area, amount) {
  const spots = [];
  if (plot.kind === 'park') return spots;
  for (let i = 0; i < amount; i += 1) {
    spots.push({
      x: plot.x - 10 + rng() * (plot.size + 20),
      y: i === 0 ? plot.y - 11 : plot.y + plot.size + 11,
      scale: between(rng, 0.8, area === 'Palmside' ? 1.35 : 1.25),
      lean: between(rng, -0.16, 0.16),
    });
  }
  return spots;
}

export function generateCity(seed) {
  const rng = makeRandom(seed ^ 0x51ed);
  const plots = [];
  const rows = [];
  const structures = [];
  const lamps = [];
  const signals = [];
  const palms = [];
  const furnishings = [];
  const shops = [];

  for (let row = 0; row < MAP.rows - 1; row += 1) {
    const line = [];
    for (let col = 0; col < MAP.columns - 1; col += 1) {
      const plot = makeLot(rng, col, row);
      plot.index = plots.length;
      plots.push(plot);
      line.push(plot);
      structures.push(...plot.structures);
      if (plot.special) shops.push({ ...plot.special, x: plot.cx, y: plot.cy, col, row });
      const area = districtAt(plot.cx, plot.cy);
      const amount = plot.kind === 'park' ? plot.greenery.length : area === 'Palmside' ? 2 : 1;
      palms.push(...pavementPalms(rng, plot, area, amount));
      if (odds(rng, 0.45)) {
        furnishings.push({
          kind: odds(rng, 0.5) ? 'bench' : 'bin',
          x: plot.x + between(rng, 8, plot.size - 8),
          y: plot.y + plot.size + 9,
        });
      }
    }
    rows.push(line);
  }

  for (let col = 0; col < MAP.columns; col += 1) {
    for (let row = 0; row < MAP.rows; row += 1) {
      const x = MAP.first + col * MAP.step;
      const y = MAP.first + row * MAP.step;
      const pattern = mixSeed(seed, col, row);
      lamps.push({ x: x + 20, y: y + 20, warm: pattern % 3 === 0 });
      lamps.push({ x: x - 20, y: y - 20, warm: pattern % 5 === 0 });
      signals.push({
        x: x + 30, y: y + 30, col, row,
        axis: pattern % 2 === 0 ? 'h' : 'v',
        phase: pattern % 4,
      });
    }
  }

  for (let i = 0; i < 46; i += 1) {
    palms.push({
      x: between(rng, 60, MAP.width - 60),
      y: between(rng, MAP.sandLine + 8, MAP.seaLine - 12),
      scale: between(rng, 0.95, 1.5),
      lean: between(rng, -0.2, 0.2),
    });
  }

  return {
    seed, plots, grid: rows, structures, lamps, signals, palms,
    furnishings, shops, buildings: structures,
  };
}

export function blockUnder(city, x, y) {
  const col = Math.floor((x - MAP.first) / MAP.step);
  const row = Math.floor((y - MAP.first) / MAP.step);
  if (col < 0 || row < 0 || col >= MAP.columns - 1 || row >= MAP.rows - 1) return null;
  return city.grid[row][col];
}

export function buildingUnder(city, x, y) {
  const plot = blockUnder(city, x, y);
  if (plot === null) return null;
  return plot.structures.find((building) => (
    x >= building.x && x <= building.x + building.w
    && y >= building.y && y <= building.y + building.h
  )) ?? null;
}

function ejectFrom(building, x, y, radius) {
  const nearX = limit(x, building.x, building.x + building.w);
  const nearY = limit(y, building.y, building.y + building.h);
  let dx = x - nearX;
  let dy = y - nearY;
  const squared = dx * dx + dy * dy;
  if (squared >= radius * radius) return { x, y, hit: false };

  if (squared < 0.0001) {
    const escapes = [
      { distance: Math.abs(x - building.x), x: building.x - radius, y: building.y + building.h / 2 },
      { distance: Math.abs(building.x + building.w - x), x: building.x + building.w + radius, y: building.y + building.h / 2 },
      { distance: Math.abs(y - building.y), x: building.x + building.w / 2, y: building.y - radius },
      { distance: Math.abs(building.y + building.h - y), x: building.x + building.w / 2, y: building.y + building.h + radius },
    ];
    escapes.sort((a, b) => a.distance - b.distance);
    return { x: escapes[0].x, y: escapes[0].y, hit: true };
  }

  const span = Math.sqrt(squared);
  dx /= span;
  dy /= span;
  return { x: nearX + dx * radius, y: nearY + dy * radius, hit: true };
}

export function clearOfBuildings(city, x, y, radius) {
  let hit = false;
  const baseCol = Math.floor((x - MAP.first) / MAP.step);
  const baseRow = Math.floor((y - MAP.first) / MAP.step);
  for (let rowShift = -1; rowShift <= 1; rowShift += 1) {
    for (let colShift = -1; colShift <= 1; colShift += 1) {
      const col = baseCol + colShift;
      const row = baseRow + rowShift;
      if (col < 0 || row < 0 || col >= MAP.columns - 1 || row >= MAP.rows - 1) continue;
      for (const building of city.grid[row][col].structures) {
        const moved = ejectFrom(building, x, y, radius);
        x = moved.x;
        y = moved.y;
        hit = hit || moved.hit;
      }
    }
  }
  if (x < radius) { x = radius; hit = true; }
  if (x > MAP.width - radius) { x = MAP.width - radius; hit = true; }
  if (y < radius) { y = radius; hit = true; }
  if (y > MAP.seaLine - radius - 6) { y = MAP.seaLine - radius - 6; hit = true; }
  return { x, y, hit };
}

export function rayBlocked(city, ax, ay, bx, by) {
  const length = Math.hypot(bx - ax, by - ay);
  const samples = Math.max(1, Math.floor(length / 10));
  for (let i = 1; i < samples; i += 1) {
    const share = i / samples;
    if (buildingUnder(city, ax + (bx - ax) * share, ay + (by - ay) * share)) return true;
  }
  return false;
}

export function shopByKind(city, kind) {
  return city.shops.find((shop) => shop.kind === kind) ?? null;
}

export function roadSample(city, rng, axis = null) {
  const direction = odds(rng, 0.5) ? 1 : -1;
  const chosen = axis ?? (odds(rng, 0.5) ? 'h' : 'v');
  if (chosen === 'h') {
    const line = MAP.first + whole(rng, 0, MAP.rows - 1) * MAP.step;
    return lanePoint('h', line, between(rng, 60, MAP.width - 60), direction);
  }
  const line = MAP.first + whole(rng, 0, MAP.columns - 1) * MAP.step;
  return lanePoint('v', line, between(rng, 60, MAP.seaLine - 60), direction);
}

export function walkSample(city, rng) {
  const plot = choose(rng, city.plots);
  const side = whole(rng, 0, 3);
  const along = between(rng, 8, plot.size - 8);
  if (side === 0) return { x: plot.x + along, y: plot.y - 10 };
  if (side === 1) return { x: plot.x + plot.size + 10, y: plot.y + along };
  if (side === 2) return { x: plot.x + along, y: plot.y + plot.size + 10 };
  return { x: plot.x - 10, y: plot.y + along };
}

export function groundTint(city, x, y) {
  const plot = blockUnder(city, x, y);
  if (plot === null || plot.structures.length === 0) return PALETTE.sand;
  return plot.structures[0].wall;
}
