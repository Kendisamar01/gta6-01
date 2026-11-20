import { WORLD } from './config.js';

const DIR_X = [1, 0, -1, 0];
const DIR_Y = [0, 1, 0, -1];

const LOOKS = {
  Downtown: ['#5f768c', '#4d647c', '#71869a', '#3f566e'],
  'Old Town': ['#a06c58', '#8d5e51', '#b07a60', '#955f4f'],
  Palmside: ['#d0bd98', '#c6b48f', '#d9c7a3', '#bda985'],
  Marina: ['#8fa3a8', '#789195', '#9db0b3', '#71898f'],
  Industrial: ['#848b8d', '#767f82', '#92999b', '#6e777a'],
  Suburbs: ['#c4a87d', '#b89a72', '#d1b58a', '#ad916c'],
};

function districtFor(x, y) {
  if (y >= WORLD.beachTop) return 'Sunstrand Beach';
  if (x < 2400) return y < 2200 ? 'Downtown' : 'Old Town';
  if (x < 4400) return y < 2600 ? 'Palmside' : 'Marina';
  return y < 2600 ? 'Industrial' : 'Suburbs';
}

function overlapsCircle(rect, x, y, radius) {
  const nearX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const nearY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - nearX;
  const dy = y - nearY;
  return dx * dx + dy * dy < radius * radius;
}

export function createCity(random) {
  const roadsX = [];
  const roadsY = [];
  for (let x = WORLD.firstRoad; x < WORLD.width - WORLD.roadWidth; x += WORLD.spacing) roadsX.push(x);
  for (let y = WORLD.firstRoad; y < WORLD.beachTop - WORLD.roadWidth; y += WORLD.spacing) roadsY.push(y);

  const buildings = [];
  const parks = [];
  const props = [];
  const lights = [];
  const parking = [];
  const blocks = [];

  function nearestRoadAxis(value, centers) {
    let best = centers[0];
    let index = 0;
    for (let i = 1; i < centers.length; i += 1) {
      const distance = Math.abs(value - centers[i]);
      if (distance < Math.abs(value - best)) {
        best = centers[i];
        index = i;
      }
    }
    return { value: best, index };
  }

  function fillBlock(left, top, right, bottom, district) {
    const width = right - left;
    const height = bottom - top;
    if (width < 90 || height < 90) return;
    blocks.push({ x: left, y: top, w: width, h: height, district });
    const colors = LOOKS[district] ?? LOOKS.Palmside;
    const dense = district === 'Downtown' || district === 'Industrial';
    const columns = dense ? random.integer(2, 3) : random.integer(1, 2);
    const rows = dense ? random.integer(2, 3) : random.integer(1, 2);
    const gap = dense ? 12 : 24;
    const cellW = (width - gap * (columns + 1)) / columns;
    const cellH = (height - gap * (rows + 1)) / rows;
    const parkChance = district === 'Palmside' ? 0.32 : district === 'Suburbs' ? 0.24 : 0.14;

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const cellX = left + gap + column * (cellW + gap);
        const cellY = top + gap + row * (cellH + gap);
        if (random.chance(parkChance)) {
          parks.push({ x: cellX, y: cellY, w: cellW, h: cellH, trees: random.integer(2, 5) });
          continue;
        }
        const insetX = cellW * random.range(0.02, 0.13);
        const insetY = cellH * random.range(0.02, 0.13);
        const building = {
          x: cellX + insetX,
          y: cellY + insetY,
          w: Math.max(26, cellW - insetX - cellW * random.range(0, 0.08)),
          h: Math.max(26, cellH - insetY - cellH * random.range(0, 0.08)),
          color: random.pick(colors),
          district,
          floors: district === 'Downtown' ? random.integer(5, 13) : random.integer(1, 4),
          roof: random.integer(0, 3),
          sign: district === 'Downtown' && random.chance(0.22) ? random.integer(0, 5) : -1,
        };
        buildings.push(building);
        if (random.chance(0.35)) {
          props.push({
            kind: random.chance(0.6) ? 'palm' : 'bench',
            x: cellX + random.range(4, Math.max(5, cellW - 4)),
            y: cellY + cellH + 4,
            scale: random.range(0.8, 1.2),
          });
        }
      }
    }
  }

  for (let column = 0; column < roadsX.length - 1; column += 1) {
    for (let row = 0; row < roadsY.length - 1; row += 1) {
      const left = roadsX[column] + WORLD.roadWidth / 2 + WORLD.sidewalk;
      const right = roadsX[column + 1] - WORLD.roadWidth / 2 - WORLD.sidewalk;
      const top = roadsY[row] + WORLD.roadWidth / 2 + WORLD.sidewalk;
      const bottom = roadsY[row + 1] - WORLD.roadWidth / 2 - WORLD.sidewalk;
      fillBlock(left, top, right, bottom, districtFor((left + right) / 2, (top + bottom) / 2));
    }
  }

  for (const roadX of roadsX) {
    for (let index = 0; index < roadsY.length - 1; index += 1) {
      for (let y = roadsY[index] + 110; y < roadsY[index + 1] - 70; y += 140) {
        parking.push({ x: roadX - WORLD.roadWidth / 2 + 15, y, angle: -Math.PI / 2, taken: false });
        parking.push({ x: roadX + WORLD.roadWidth / 2 - 15, y: y + 55, angle: Math.PI / 2, taken: false });
      }
    }
  }
  for (const roadY of roadsY) {
    for (let index = 0; index < roadsX.length - 1; index += 1) {
      for (let x = roadsX[index] + 120; x < roadsX[index + 1] - 70; x += 150) {
        parking.push({ x, y: roadY - WORLD.roadWidth / 2 + 15, angle: 0, taken: false });
        parking.push({ x: x + 60, y: roadY + WORLD.roadWidth / 2 - 15, angle: Math.PI, taken: false });
      }
    }
  }

  for (const roadX of roadsX) {
    for (const roadY of roadsY) {
      lights.push({ x: roadX, y: roadY, phase: random.integer(0, 3), offset: random.range(0, 4) });
      if (random.chance(0.7)) {
        props.push({ kind: 'lamp', x: roadX + WORLD.roadWidth / 2 + 10, y: roadY - WORLD.roadWidth / 2 - 10, scale: 1 });
      }
    }
  }
  for (let x = 180; x < WORLD.width - 100; x += 140) {
    props.push({ kind: 'palm', x, y: WORLD.beachTop + 44 + random.range(-14, 14), scale: random.range(1, 1.4) });
    if (random.chance(0.7)) props.push({ kind: 'palm', x: x + 58, y: WORLD.waterTop - 42 + random.range(-8, 8), scale: random.range(0.85, 1.15) });
  }

  const cellSize = WORLD.spacing;
  const occupied = new Map();
  for (let index = 0; index < buildings.length; index += 1) {
    const building = buildings[index];
    const fromX = Math.floor(building.x / cellSize);
    const toX = Math.floor((building.x + building.w) / cellSize);
    const fromY = Math.floor(building.y / cellSize);
    const toY = Math.floor((building.y + building.h) / cellSize);
    for (let cx = fromX; cx <= toX; cx += 1) {
      for (let cy = fromY; cy <= toY; cy += 1) {
        const key = `${cx}:${cy}`;
        let bucket = occupied.get(key);
        if (!bucket) {
          bucket = [];
          occupied.set(key, bucket);
        }
        bucket.push(index);
      }
    }
  }

  function districtAt(x, y) {
    return districtFor(x, y);
  }

  function isWater(x, y) {
    return y > WORLD.waterTop;
  }

  function isRoad(x, y) {
    if (y > WORLD.waterTop) return false;
    const nearX = nearestRoadAxis(x, roadsX).value;
    const nearY = nearestRoadAxis(y, roadsY).value;
    return Math.abs(x - nearX) < WORLD.roadWidth / 2 || Math.abs(y - nearY) < WORLD.roadWidth / 2;
  }

  function isSolid(x, y, radius = 0) {
    if (x < radius || y < radius || x > WORLD.width - radius || y > WORLD.waterTop - radius) return true;
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        const bucket = occupied.get(`${cx + ox}:${cy + oy}`);
        if (!bucket) continue;
        for (const index of bucket) if (overlapsCircle(buildings[index], x, y, radius)) return true;
      }
    }
    return false;
  }

  function nearestRoadPoint(x, y) {
    const vertical = nearestRoadAxis(x, roadsX);
    const horizontal = nearestRoadAxis(y, roadsY);
    if (Math.abs(x - vertical.value) < Math.abs(y - horizontal.value)) {
      return { x: vertical.value, y: Math.min(WORLD.waterTop - 30, Math.max(20, y)), vertical: true, index: vertical.index };
    }
    return { x: Math.min(WORLD.width - 20, Math.max(20, x)), y: horizontal.value, vertical: false, index: horizontal.index };
  }

  function nodeAt(column, row) {
    return { column, row, x: roadsX[column], y: roadsY[row] };
  }

  function neighbor(node, direction) {
    const next = nodeAt(
      Math.max(0, Math.min(roadsX.length - 1, node.column + DIR_X[direction])),
      Math.max(0, Math.min(roadsY.length - 1, node.row + DIR_Y[direction])),
    );
    return next;
  }

  function randomNode(pickRandom = random) {
    return nodeAt(pickRandom.integer ? pickRandom.integer(1, roadsX.length - 2) : Math.floor(pickRandom() * (roadsX.length - 2)) + 1,
      pickRandom.integer ? pickRandom.integer(1, roadsY.length - 2) : Math.floor(pickRandom() * (roadsY.length - 2)) + 1);
  }

  const garage = { x: roadsX[6] + WORLD.roadWidth / 2 + 52, y: roadsY[4] - 20, radius: 62, color: '#c85b4d' };
  const policeStation = { x: roadsX[3] - WORLD.roadWidth / 2 - 58, y: roadsY[8] + 30, radius: 64, color: '#2b4b78' };

  return {
    roadsX, roadsY, buildings, parks, props, lights, parking, blocks, garage, policeStation,
    districtAt, isWater, isRoad, isSolid, nearestRoadPoint, nodeAt, neighbor, randomNode,
    start: { x: roadsX[3], y: roadsY[3] },
  };
}
