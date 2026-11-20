import { WORLD, COLORS } from './config.js';
import { between, whole, pick, chance } from './random.js';

const NAMES = {
  downtown: 'Downtown Solara',
  marina: 'Marina Vista',
  palmside: 'Palmside',
  oldtown: 'Old Town',
  industrial: 'Ironworks',
  suburbs: 'Cedar Heights',
  beach: 'Sunstrand',
};

export function districtForCell(col, row) {
  if (row >= WORLD.rows - 1) return 'beach';
  if (col >= 5 && col <= 8 && row >= 3 && row <= 6) return 'downtown';
  if (col <= 3 && row >= 4 && row <= 8) return 'marina';
  if (col >= 9 && row <= 5) return 'palmside';
  if (col <= 4 && row <= 3) return 'oldtown';
  if (col <= 8 && row >= 7) return 'industrial';
  return 'suburbs';
}

function paletteFor(district) {
  return COLORS[district] || COLORS.downtown;
}

function addBuildings(random, block) {
  const cell = WORLD.cell;
  const road = WORLD.road;
  const district = block.district;
  const left = block.col * cell + road / 2 + 16;
  const top = block.row * cell + road / 2 + 16;
  const span = cell - road - 32;
  let across = 2;
  let down = 2;
  if (district === 'oldtown') { across = 3; down = 2; }
  if (district === 'industrial') { across = 1; down = 2; }
  if (district === 'suburbs') { across = 1; down = 1; }
  if (district === 'palmside') { across = 2; down = 1; }
  if (district === 'marina') { across = 2; down = 2; }
  const lotWidth = span / across;
  const lotHeight = span / down;
  const walls = paletteFor(district);
  for (let iy = 0; iy < down; iy += 1) {
    for (let ix = 0; ix < across; ix += 1) {
      if (district === 'suburbs' && chance(random, 0.24)) continue;
      const margin = between(random, 5, 13);
      const width = Math.max(48, lotWidth - margin * 2);
      const height = Math.max(42, lotHeight - margin * 2);
      let tall = between(random, 5, 14);
      if (district === 'downtown') tall = between(random, 18, 52);
      if (district === 'industrial') tall = between(random, 8, 18);
      if (district === 'suburbs') tall = between(random, 3, 8);
      block.buildings.push({
        x: left + ix * lotWidth + margin,
        y: top + iy * lotHeight + margin,
        width,
        height,
        tall,
        wall: pick(random, walls),
        roof: pick(random, COLORS.roof),
        detail: random(),
        panes: whole(random, 2, 5),
      });
    }
  }
}

function addProps(random, block) {
  const cell = WORLD.cell;
  const road = WORLD.road;
  const blockLeft = block.col * cell;
  const blockTop = block.row * cell;
  const inset = road / 2 + 7;
  const inner = cell - road - 14;
  if ((block.col + block.row) % 2 === 0) {
    block.lamps.push({
      x: blockLeft - road / 2 - 8,
      y: blockTop - road / 2 - 8,
      warm: random(),
    });
  }
  const count = block.district === 'beach' ? 4 : block.district === 'downtown' ? 1 : 2;
  for (let index = 0; index < count; index += 1) {
    const across = inner * ((index + 0.5) / count);
    const sway = between(random, -7, 7);
    block.palms.push({
      x: blockLeft + inset + across + sway,
      y: blockTop + inset - 7,
      lean: between(random, -0.2, 0.2),
      size: between(random, 0.85, 1.2),
    });
    if (block.district === 'beach' || chance(random, 0.45)) {
      block.palms.push({
        x: blockLeft + inset + across + sway,
        y: blockTop + cell - inset + 7,
        lean: between(random, -0.2, 0.2),
        size: between(random, 0.85, 1.2),
      });
    }
  }
  if (block.park) {
    for (let index = 0; index < 3; index += 1) {
      block.trees.push({
        x: blockLeft + inset + between(random, 20, inner - 20),
        y: blockTop + inset + between(random, 20, inner - 20),
        size: between(random, 0.8, 1.25),
      });
    }
    block.benches.push({
      x: blockLeft + cell / 2,
      y: blockTop + cell - inset - 12,
      angle: 0,
    });
  }
}

export function createCity(random) {
  const blocks = [];
  for (let row = 0; row < WORLD.rows; row += 1) {
    for (let col = 0; col < WORLD.cols; col += 1) {
      const district = districtForCell(col, row);
      const block = {
        col,
        row,
        district,
        name: NAMES[district],
        x: col * WORLD.cell,
        y: row * WORLD.cell,
        buildings: [],
        palms: [],
        trees: [],
        lamps: [],
        benches: [],
        park: false,
        shade: random(),
      };
      if (district !== 'beach') {
        const parkOdds = district === 'downtown' ? 0.06 : district === 'suburbs' ? 0.2 : 0.12;
        if (chance(random, parkOdds)) block.park = true;
        else addBuildings(random, block);
      }
      addProps(random, block);
      blocks.push(block);
    }
  }
  return {
    blocks,
    cols: WORLD.cols,
    rows: WORLD.rows,
    cell: WORLD.cell,
    road: WORLD.road,
    width: WORLD.width,
    height: WORLD.height,
    shoreY: WORLD.shoreY,
  };
}

export function blockAt(city, x, y) {
  const col = Math.floor(x / city.cell);
  const row = Math.floor(y / city.cell);
  if (col < 0 || row < 0 || col >= city.cols || row >= city.rows) return null;
  return city.blocks[row * city.cols + col];
}

export function districtAt(city, x, y) {
  const block = blockAt(city, x, y);
  return block === null ? NAMES.beach : block.name;
}

export function isWater(city, x, y) {
  return y > city.shoreY || x < -40 || x > city.width + 40;
}

export function isRoad(city, x, y) {
  if (y > city.shoreY) return false;
  const vertical = Math.abs(x - Math.round(x / city.cell) * city.cell);
  const horizontal = Math.abs(y - Math.round(y / city.cell) * city.cell);
  return vertical <= city.road / 2 || horizontal <= city.road / 2;
}

export function clampWorld(city, x, y, radius = 0) {
  const limitY = city.shoreY - radius - 4;
  return {
    x: Math.min(city.width - radius - 4, Math.max(radius + 4, x)),
    y: Math.min(limitY, Math.max(radius + 4, y)),
  };
}

export function solidsNear(city, x, y, radius, out = []) {
  out.length = 0;
  const reach = radius + 4;
  const firstCol = Math.max(0, Math.floor((x - reach) / city.cell));
  const lastCol = Math.min(city.cols - 1, Math.floor((x + reach) / city.cell));
  const firstRow = Math.max(0, Math.floor((y - reach) / city.cell));
  const lastRow = Math.min(city.rows - 1, Math.floor((y + reach) / city.cell));
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
      const block = city.blocks[row * city.cols + col];
      for (let index = 0; index < block.buildings.length; index += 1) {
        const building = block.buildings[index];
        if (building.x > x + reach || building.x + building.width < x - reach) continue;
        if (building.y > y + reach || building.y + building.height < y - reach) continue;
        out.push(building);
      }
    }
  }
  return out;
}
