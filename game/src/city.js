import { CITY, DISTRICTS, SOLARA } from './config.js';
import { between, chance, choose, createRandom, integer } from './random.js';

export function cityBounds() {
  return { width: CITY.cols * CITY.cell, height: CITY.rows * CITY.cell };
}

export function cellOf(x, y) {
  return { col: Math.floor(x / CITY.cell), row: Math.floor(y / CITY.cell) };
}

export function districtAt(x, y) {
  const { col, row } = cellOf(x, y);
  if (col >= CITY.waterCol && row >= CITY.beachRow - 1) return 'Sunset Bay';
  if (row < 4) return DISTRICTS[0];
  if (col < 4) return DISTRICTS[1];
  if (col < 8) return DISTRICTS[2];
  if (col < 11) return DISTRICTS[3];
  if (col < CITY.waterCol) return DISTRICTS[4];
  return DISTRICTS[5];
}

export function isWaterCell(col, row) {
  return col >= CITY.waterCol && row >= CITY.beachRow - 1;
}

export function isBeachCell(col, row) {
  if (isWaterCell(col, row)) return false;
  return (col === CITY.waterCol - 1 && row >= CITY.beachRow - 2)
    || (row === CITY.beachRow - 2 && col >= CITY.waterCol - 2);
}

export function isWaterAt(x, y) {
  if (x < 0 || y < 0) return true;
  const bounds = cityBounds();
  if (x > bounds.width || y > bounds.height) return true;
  const cell = cellOf(x, y);
  return isWaterCell(cell.col, cell.row);
}

const WALL_COLORS = ['#dcb98d', '#d3ac83', '#e3c59f', '#c99d78', '#e8d0a8', '#cfa686'];
const ROOF_COLORS = ['#9a6a54', '#a97a5d', '#876052', '#b98a68', '#8e6659'];

function interior(col, row) {
  const half = CITY.road / 2;
  const x = col * CITY.cell + half;
  const y = row * CITY.cell + half;
  const size = CITY.cell - CITY.road;
  return { x, y, size, pad: CITY.sidewalk };
}

function addBuilding(city, rect, role, random, index) {
  const wall = choose(random, WALL_COLORS);
  const roof = choose(random, ROOF_COLORS);
  const building = {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    role,
    wall,
    roof,
    floors: role === 'tower' ? integer(random, 4, 8) : integer(random, 1, 3),
    detail: integer(random, 0, 3),
    seed: integer(random, 0, 9999),
    sign: '',
    id: index,
  };
  city.solids.push(building);
  city.buildings.push(building);
  return building;
}

function splitRect(rect, random, alongX) {
  const gap = 12;
  if (alongX) {
    const cut = Math.round(between(random, 0.38, 0.62) * rect.w);
    return [
      { x: rect.x, y: rect.y, w: cut - gap / 2, h: rect.h },
      { x: rect.x + cut + gap / 2, y: rect.y, w: rect.w - cut - gap / 2, h: rect.h },
    ];
  }
  const cut = Math.round(between(random, 0.4, 0.6) * rect.h);
  return [
    { x: rect.x, y: rect.y, w: rect.w, h: cut - gap / 2 },
    { x: rect.x, y: rect.y + cut + gap / 2, w: rect.w, h: rect.h - cut - gap / 2 },
  ];
}

function addPalm(city, x, y, random) {
  city.decor.push({ type: 'palm', x, y, size: between(random, 0.8, 1.25), lean: between(random, -0.3, 0.3), phase: random() * 6.28 });
}

function buildCell(city, col, row, random) {
  const area = interior(col, row);
  const x = area.x + area.pad;
  const y = area.y + area.pad;
  const w = area.size - area.pad * 2;
  const h = area.size - area.pad * 2;
  const rect = { x, y, w, h };
  const center = { x: x + w / 2, y: y + h / 2 };
  const district = districtAt(center.x, center.y);

  if (isBeachCell(col, row)) {
    city.beaches.push(rect);
    for (let i = 0; i < 3; i += 1) addPalm(city, x + between(random, 12, w - 12), y + between(random, 12, h - 12), random);
    city.decor.push({ type: 'bench', x: x + w * 0.35, y: y + h * 0.7, angle: 0 });
    return;
  }

  const marker = (col * 7 + row * 11) % 19;
  if (marker === 0 || (district === 'Pine Heights' && marker === 5)) {
    city.parks.push({ x, y, w, h, district });
    city.decor.push({ type: 'fountain', x: center.x, y: center.y, size: Math.min(w, h) * 0.28 });
    for (let i = 0; i < 4; i += 1) {
      addPalm(city, x + (i % 2 ? w - 16 : 16), y + (i < 2 ? 16 : h - 16), random);
    }
    return;
  }
  if (marker === 9) {
    city.plazas.push(rect);
    city.decor.push({ type: 'stall', x: center.x - 20, y: y + 18, color: '#e8705a' });
    city.decor.push({ type: 'stall', x: center.x + 18, y: y + h - 20, color: '#58b1c4' });
    return;
  }

  const landmark = city.landmarks.find((place) => place.col === col && place.row === row);
  let role = 'shop';
  if (district === 'Downtown') role = chance(random, 0.7) ? 'tower' : 'block';
  else if (district === 'Marina' || district === 'Sunset Bay') role = 'warehouse';
  else if (district === 'Pine Heights') role = 'villa';
  else if (district === 'Old Town') role = chance(random, 0.5) ? 'shop' : 'block';
  else role = chance(random, 0.5) ? 'plant' : 'warehouse';

  let parts = [rect];
  if (role === 'villa') parts = splitRect(splitRect(rect, random, true)[0], random, false).concat(splitRect(rect, random, true)[1]);
  else if (role === 'shop' && chance(random, 0.55)) parts = splitRect(rect, random, chance(random, 0.5));
  else if (role === 'block' && chance(random, 0.45)) parts = splitRect(rect, random, false);

  for (const part of parts) {
    if (part.w < 18 || part.h < 18) continue;
    const building = addBuilding(city, part, role, random, city.buildings.length);
    if (landmark) {
      building.sign = landmark.name;
      landmark.x = part.x + part.w / 2;
      landmark.y = part.y + part.h / 2;
    }
  }

  if (chance(random, 0.55)) addPalm(city, x + 6, y + h - 4, random);
  if (chance(random, 0.35)) addPalm(city, x + w - 6, y + 4, random);
}

function addRoadFurniture(city, random) {
  for (let col = 0; col <= CITY.cols; col += 1) {
    for (let row = 0; row <= CITY.rows; row += 1) {
      if (isWaterCell(col, row)) continue;
      city.lights.push({ x: col * CITY.cell, y: row * CITY.cell, phase: (col + row) % 2, radius: 190 });
      if (chance(random, 0.72)) {
        city.decor.push({
          type: 'lamp',
          x: col * CITY.cell + CITY.road / 2 + 5,
          y: row * CITY.cell + CITY.road / 2 + 5,
        });
      }
    }
  }
}

function addSpawnPoints(city, random) {
  const bounds = cityBounds();
  for (let row = 1; row < CITY.rows; row += 1) {
    for (let col = 1; col < CITY.cols; col += 2) {
      const y = row * CITY.cell + CITY.road / 4;
      const x = col * CITY.cell + between(random, -40, 70);
      if (!isWaterAt(x, y)) city.roadSpawns.push({ x, y, angle: 0, type: choose(random, ['sedan', 'taxi', 'van', 'sports']) });
    }
  }
  for (let col = 1; col < CITY.cols; col += 1) {
    for (let row = 1; row < CITY.rows; row += 2) {
      const x = col * CITY.cell + CITY.road / 4;
      const y = row * CITY.cell + between(random, -40, 70);
      if (!isWaterAt(x, y)) city.roadSpawns.push({ x, y, angle: Math.PI / 2, type: choose(random, ['sedan', 'van', 'sports', 'taxi']) });
    }
  }
  for (let index = 0; index < 34; index += 1) {
    const col = integer(random, 0, CITY.cols - 1);
    const row = integer(random, 0, CITY.rows - 1);
    if (isWaterCell(col, row) || isBeachCell(col, row)) continue;
    const horizontal = chance(random, 0.5);
    const along = between(random, 0.12, 0.88) * CITY.cell;
    const cross = CITY.road / 2 + 10;
    const x = col * CITY.cell + (horizontal ? along : cross);
    const y = row * CITY.cell + (horizontal ? cross : along);
    if (x < bounds.width && y < bounds.height) {
      city.parkedSpawns.push({ x, y, angle: horizontal ? 0 : Math.PI / 2, type: choose(random, ['sedan', 'taxi', 'van', 'truck', 'sports']) });
    }
  }
  for (let index = 0; index < 90; index += 1) {
    const col = integer(random, 0, CITY.cols - 1);
    const row = integer(random, 0, CITY.rows - 1);
    if (isWaterCell(col, row) || isBeachCell(col, row)) continue;
    const onHorizontal = chance(random, 0.5);
    const x = col * CITY.cell + between(random, -CITY.road / 2 + 8, CITY.cell - CITY.road / 2 - 8);
    const y = row * CITY.cell + (onHorizontal ? CITY.road / 2 - 10 : between(random, -CITY.road / 2 + 8, CITY.cell - CITY.road / 2 - 8));
    if (onHorizontal && isWaterAt(x, y)) continue;
    city.pedSpawns.push({ x, y, angle: choose(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]) });
  }
}

export function generateCity(seed) {
  const random = createRandom(seed ^ 0x5b1a7);
  const bounds = cityBounds();
  const city = {
    seed,
    bounds,
    solids: [],
    buildings: [],
    parks: [],
    plazas: [],
    beaches: [],
    decor: [],
    lights: [],
    roadSpawns: [],
    parkedSpawns: [],
    pedSpawns: [],
    landmarks: [
      { col: 2, row: 2, name: 'BAY PRECINCT', type: 'police' },
      { col: 6, row: 1, name: 'SUN CLINIC', type: 'hospital' },
      { col: 10, row: 9, name: 'MIRACLE DETAIL', type: 'spray' },
      { col: 5, row: 7, name: 'MARGO TOWER', type: 'mission' },
      { col: 12, row: 5, name: 'TIDAL WORKS', type: 'mission' },
    ],
  };

  for (let row = 0; row < CITY.rows; row += 1) {
    for (let col = 0; col < CITY.cols; col += 1) {
      if (isWaterCell(col, row)) continue;
      buildCell(city, col, row, random);
    }
  }
  addRoadFurniture(city, random);
  addSpawnPoints(city, random);
  for (const place of city.landmarks) {
    if (place.x === undefined) {
      const area = interior(place.col, place.row);
      place.x = area.x + area.size / 2;
      place.y = area.y + area.size / 2;
    }
  }
  city.districtCenters = DISTRICTS.map((name, index) => ({
    name,
    x: (index * 2.6 + 1.7) * CITY.cell,
    y: (index % 2 === 0 ? 2.3 : 8.2) * CITY.cell,
  }));
  city.colors = SOLARA;
  return city;
}

export function blockedAt(city, x, y, radius) {
  if (isWaterAt(x, y)) return true;
  if (x < radius || y < radius || x > city.bounds.width - radius || y > city.bounds.height - radius) return true;
  const minCol = Math.floor((x - radius) / CITY.cell);
  const maxCol = Math.floor((x + radius) / CITY.cell);
  const minRow = Math.floor((y - radius) / CITY.cell);
  const maxRow = Math.floor((y + radius) / CITY.cell);
  for (const solid of city.solids) {
    if (solid.col === undefined) {
      solid.col = Math.floor(solid.x / CITY.cell);
      solid.row = Math.floor(solid.y / CITY.cell);
    }
    if (solid.col < minCol - 1 || solid.col > maxCol + 1 || solid.row < minRow - 1 || solid.row > maxRow + 1) continue;
    if (x + radius > solid.x && x - radius < solid.x + solid.w && y + radius > solid.y && y - radius < solid.y + solid.h) return true;
  }
  return false;
}

export function moveWithCollision(city, actor, dx, dy, radius) {
  const nextX = actor.x + dx;
  if (!blockedAt(city, nextX, actor.y, radius)) actor.x = nextX;
  const nextY = actor.y + dy;
  if (!blockedAt(city, actor.x, nextY, radius)) actor.y = nextY;
}

export function rayHitsBuilding(city, x0, y0, x1, y1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 16);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (blockedAt(city, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 2)) return true;
  }
  return false;
}
