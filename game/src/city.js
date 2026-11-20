// Map data for Solara Bay. Nothing here draws: it turns a seed into a fixed grid of cells, each
// with a terrain type, a district, buildings and small props. Queries at the bottom let the rest
// of the game ask what is under a point without knowing how the map was generated.
import { CITY, DISTRICTS } from './config.js';
import { cellRandom, chance, choice, hashCell, integer } from './random.js';

const AVENUES = [
  'Almond Avenue', 'Cedar Boulevard', 'Dolphin Drive', 'Estrella Street', 'Flamingo Walk',
  'Goldfinch Avenue', 'Harbor Road', 'Ibis Lane', 'Jasmine Street', 'Kestrel Avenue',
  'Lagoon Drive', 'Marigold Street', 'Nectar Lane', 'Orchid Avenue', 'Pine Street',
  'Quartz Road', 'Rosewood Avenue', 'Sable Street', 'Tangerine Drive', 'Umber Lane',
  'Violet Avenue', 'Willow Street', 'Zephyr Road', 'Sunboard Way', 'Coral Avenue',
  'Pelican Street', 'Anise Drive', 'Banyan Road', 'Cobalt Avenue', 'Dune Street',
  'Emerald Way', 'Fern Lane', 'Gull Street',
];

const STREETS = [
  'First Street', 'Second Street', 'Third Street', 'Fourth Street', 'Fifth Street',
  'Sixth Street', 'Seventh Street', 'Eighth Street', 'Ninth Street', 'Tenth Street',
  'Bayview Street', 'Causeway Lane', 'Driftwood Street', 'Eastwind Road', 'Fountain Lane',
  'Garden Street', 'Highridge Road', 'Island Way', 'Jetty Street', 'Kiosk Lane',
  'Lantern Street', 'Mosaic Road', 'Northshore Street', 'Olive Lane', 'Pier Street',
  'Quay Road', 'Ridgeway Street', 'Sailfish Lane', 'Terrace Road', 'Union Street',
  'Vista Lane', 'Wharf Street', 'Yacht Road', 'Zenith Street',
];

const FALLBACK_DISTRICT = { name: 'Outskirts', style: 'palm', tint: '#b8c59c', density: 0.5 };

function districtForCell(column, row) {
  for (let index = 0; index < DISTRICTS.length; index += 1) {
    const district = DISTRICTS[index];
    if (column >= district.column[0] && column <= district.column[1] && row >= district.row[0] && row <= district.row[1]) {
      return district;
    }
  }
  return FALLBACK_DISTRICT;
}

/** A slightly uneven coastline keeps the shore from looking like a ruler. */
function coastRow(seed, column) {
  return CITY.shoreRow + (hashCell(seed, column, 0, 5) % 3 === 0 ? 1 : 0);
}

function bayColumn(seed, row) {
  return CITY.bayColumn + (hashCell(seed, 0, row, 6) % 3 === 0 ? 1 : 0);
}

function terrainForCell(seed, column, row) {
  if (row >= coastRow(seed, column)) return 'water';
  if (row === coastRow(seed, column) - 1) return 'sand';
  if (column >= bayColumn(seed, row) && row >= CITY.bayRow) return 'water';
  if (column === bayColumn(seed, row) - 1 && row >= CITY.bayRow) return 'sand';
  return 'land';
}

function buildingShape(random, x, y, size, style) {
  const group = style === 'tower' ? integer(random, 1, 2) : style === 'house' ? integer(random, 1, 2) : integer(random, 1, 4);
  const result = [];
  const gap = group === 1 ? 0 : style === 'industrial' ? 4 : 6;
  const columns = group === 4 ? 2 : group === 2 && chance(random, 0.5) ? 2 : 1;
  const rows = group === 4 ? 2 : group === 2 && columns === 1 ? 2 : 1;
  const wide = (size - gap * (columns - 1)) / columns;
  const tall = (size - gap * (rows - 1)) / rows;
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < columns; gx += 1) {
      const inset = group === 1 ? integer(random, 0, 7) : integer(random, 0, 3);
      const bx = x + gx * (wide + gap) + inset;
      const by = y + gy * (tall + gap) + inset;
      const w = Math.max(16, wide - inset * 2);
      const h = Math.max(16, tall - inset * 2);
      let storeys;
      if (style === 'tower') storeys = integer(random, 3, 6);
      else if (style === 'industrial') storeys = integer(random, 1, 2);
      else if (style === 'house' || style === 'beach') storeys = 1;
      else storeys = integer(random, 1, 3);
      const roofs = style === 'house' || style === 'beach' ? ['gable', 'gable', 'flat'] : style === 'tower' ? ['flat', 'flat', 'step'] : ['flat', 'gable', 'terrace'];
      result.push({
        x: bx,
        y: by,
        width: w,
        height: h,
        storeys,
        roof: choice(random, roofs),
        wall: integer(random, 0, 4),
        detail: hashCell(random() * 4294967296 | 0, gx, gy, 9),
        landmark: null,
      });
    }
  }
  return result;
}

function fillLandCell(cell, seed) {
  const random = cellRandom(seed, cell.column, cell.row, 1);
  const originX = cell.column * CITY.cell + CITY.road / 2;
  const originY = cell.row * CITY.cell + CITY.road / 2;
  const lot = CITY.cell - CITY.road;
  const x = originX + CITY.lotPadding;
  const y = originY + CITY.lotPadding;
  const size = lot - CITY.lotPadding * 2;

  const parkChance = cell.style === 'palm' || cell.style === 'beach' ? 0.17 : cell.style === 'house' ? 0.16 : 0.07;
  if (cell.terrain === 'land' && chance(random, parkChance)) {
    cell.park = true;
    const trees = integer(random, 3, 6);
    for (let index = 0; index < trees; index += 1) {
      cell.props.push({ type: 'tree', x: x + 8 + random() * (size - 16), y: y + 8 + random() * (size - 16), size: 7 + random() * 5 });
    }
    cell.props.push({ type: 'bench', x: x + size / 2 - 11, y: y + size / 2, size: 22 });
    return;
  }

  if (cell.terrain === 'sand') {
    for (let index = 0; index < integer(random, 0, 2); index += 1) {
      cell.props.push({ type: 'palm', x: x + random() * size, y: y + random() * size, size: 12 + random() * 6 });
    }
    return;
  }

  if (chance(random, cell.density)) {
    cell.buildings = buildingShape(random, x, y, size, cell.style);
  } else {
    cell.props.push({ type: 'tree', x: x + size / 2, y: y + size / 2, size: 10 });
  }

  if (cell.terrain === 'land' && chance(random, 0.55)) {
    const side = integer(random, 0, 3);
    const along = 10 + random() * (CITY.cell - CITY.road - 20);
    const edge = originX - CITY.road / 2 + 4;
    const px = side === 0 ? edge : side === 1 ? originX + lot + CITY.road / 2 - 4 : originX + along;
    const py = side === 2 ? edge : side === 3 ? originY + lot + CITY.road / 2 - 4 : originY + along;
    cell.props.push({ type: 'palm', x: px, y: py, size: 13 + random() * 6 });
  }
}

export function createCity(seed) {
  const grid = CITY.grid;
  const cells = new Array(grid * grid);
  for (let row = 0; row < grid; row += 1) {
    for (let column = 0; column < grid; column += 1) {
      const district = districtForCell(column, row);
      const cell = {
        column,
        row,
        terrain: terrainForCell(seed, column, row),
        district: district.name,
        style: district.style,
        tint: district.tint,
        density: district.density,
        park: false,
        buildings: [],
        props: [],
      };
      cells[row * grid + column] = cell;
      if (cell.terrain !== 'water') fillLandCell(cell, seed);
    }
  }

  const landmarks = [];
  const place = (column, row, label, index) => {
    const cell = cells[row * grid + column];
    if (!cell || !cell.buildings.length) return;
    cell.buildings[index % cell.buildings.length].landmark = label;
    landmarks.push({ name: label, x: (column + 0.5) * CITY.cell, y: (row + 0.5) * CITY.cell });
  };
  place(16, 8, 'Civic Hall', 0);
  place(7, 9, 'Old Town Infirmary', 0);
  place(18, 13, 'Bay General Hospital', 0);
  place(24, 19, 'Blue Wave Detail', 0);
  place(5, 20, 'Palmside Precinct', 0);

  return { seed, grid, cellSize: CITY.cell, road: CITY.road, size: grid * CITY.cell, cells, landmarks };
}

export function cellAt(city, x, y) {
  const column = Math.floor(x / city.cellSize);
  const row = Math.floor(y / city.cellSize);
  if (column < 0 || row < 0 || column >= city.grid || row >= city.grid) return null;
  return city.cells[row * city.grid + column];
}

export function districtAt(city, x, y) {
  const cell = cellAt(city, x, y);
  return cell ? cell.district : 'Open Water';
}

export function streetAt(city, x, y) {
  const column = Math.floor(x / city.cellSize);
  const row = Math.floor(y / city.cellSize);
  const avenue = AVENUES[((column % AVENUES.length) + AVENUES.length) % AVENUES.length];
  const street = STREETS[((row % STREETS.length) + STREETS.length) % STREETS.length];
  return hashCell(city.seed, column, row, 4) % 2 === 0 ? `${street} & ${avenue}` : `${avenue} & ${street}`;
}

export function terrainAt(city, x, y) {
  const cell = cellAt(city, x, y);
  return cell ? cell.terrain : 'water';
}

export function isRoadAt(city, x, y) {
  const cell = cellAt(city, x, y);
  if (!cell || cell.terrain === 'water') return false;
  const localX = x - cell.column * city.cellSize;
  const localY = y - cell.row * city.cellSize;
  const half = city.road / 2;
  return localX < half || localX > city.cellSize - half || localY < half || localY > city.cellSize - half;
}

export function isSolid(city, x, y) {
  const cell = cellAt(city, x, y);
  if (!cell) return true;
  if (cell.terrain === 'water') return true;
  const buildings = cell.buildings;
  for (let index = 0; index < buildings.length; index += 1) {
    const building = buildings[index];
    if (x >= building.x && x <= building.x + building.width && y >= building.y && y <= building.y + building.height) return true;
  }
  return false;
}
