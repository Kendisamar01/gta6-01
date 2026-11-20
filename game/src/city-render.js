import { CITY, SOLARA } from './config.js';
import { isNight } from './world.js';
import { gridHash } from './random.js';
import { visibleRect } from './camera.js';

function visibleBuilding(building, view) {
  return building.x < view.x + view.w && building.x + building.w > view.x && building.y < view.y + view.h && building.y + building.h > view.y;
}

function drawGround(ctx, world, view) {
  ctx.fillStyle = SOLARA.asphalt;
  ctx.fillRect(view.x, view.y, view.w, view.h);
  const firstCol = Math.max(0, Math.floor(view.x / CITY.cell) - 1);
  const lastCol = Math.min(CITY.cols - 1, Math.ceil((view.x + view.w) / CITY.cell));
  const firstRow = Math.max(0, Math.floor(view.y / CITY.cell) - 1);
  const lastRow = Math.min(CITY.rows - 1, Math.ceil((view.y + view.h) / CITY.cell));
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
      if (col >= CITY.waterCol && row >= CITY.beachRow - 1) {
        const grad = ctx.createLinearGradient(col * CITY.cell, row * CITY.cell, (col + 1) * CITY.cell, (row + 1) * CITY.cell);
        grad.addColorStop(0, SOLARA.deep);
        grad.addColorStop(1, SOLARA.water);
        ctx.fillStyle = grad;
        ctx.fillRect(col * CITY.cell, row * CITY.cell, CITY.cell, CITY.cell);
        ctx.strokeStyle = 'rgba(190,240,245,0.2)';
        ctx.lineWidth = 2;
        for (let wave = 0; wave < 3; wave += 1) {
          const y = row * CITY.cell + 44 + wave * 54 + Math.sin(world.elapsed * 1.4 + col + wave) * 5;
          ctx.beginPath();
          ctx.moveTo(col * CITY.cell + 12, y);
          ctx.quadraticCurveTo(col * CITY.cell + CITY.cell / 2, y - 12, col * CITY.cell + CITY.cell - 12, y);
          ctx.stroke();
        }
      } else if ((col === CITY.waterCol - 1 && row >= CITY.beachRow - 2) || (row === CITY.beachRow - 2 && col >= CITY.waterCol - 2)) {
        ctx.fillStyle = SOLARA.sand;
        ctx.fillRect(col * CITY.cell, row * CITY.cell, CITY.cell, CITY.cell);
      } else {
        ctx.fillStyle = '#8f958b';
        ctx.fillRect(col * CITY.cell + CITY.road / 2, row * CITY.cell + CITY.road / 2, CITY.cell - CITY.road, CITY.cell - CITY.road);
      }
    }
  }
}

function drawRoads(ctx, world, view) {
  const night = isNight(world);
  const firstCol = Math.max(0, Math.floor(view.x / CITY.cell) - 1);
  const lastCol = Math.min(CITY.cols, Math.ceil((view.x + view.w) / CITY.cell));
  const firstRow = Math.max(0, Math.floor(view.y / CITY.cell) - 1);
  const lastRow = Math.min(CITY.rows, Math.ceil((view.y + view.h) / CITY.cell));
  const half = CITY.road / 2;
  ctx.fillStyle = SOLARA.road;
  for (let col = firstCol; col <= lastCol; col += 1) {
    for (let row = firstRow; row < lastRow; row += 1) {
      if (col >= CITY.waterCol && row >= CITY.beachRow - 1) continue;
      ctx.fillRect(col * CITY.cell - half, row * CITY.cell, CITY.road, CITY.cell);
    }
  }
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = firstCol; col < lastCol; col += 1) {
      if (col >= CITY.waterCol && row >= CITY.beachRow - 1) continue;
      ctx.fillRect(col * CITY.cell, row * CITY.cell - half, CITY.cell, CITY.road);
    }
  }
  ctx.strokeStyle = night ? 'rgba(240,222,150,0.35)' : 'rgba(244,226,158,0.62)';
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 22]);
  for (let row = firstRow; row <= lastRow; row += 1) {
    ctx.beginPath();
    ctx.moveTo(firstCol * CITY.cell, row * CITY.cell);
    ctx.lineTo(lastCol * CITY.cell, row * CITY.cell);
    ctx.stroke();
  }
  for (let col = firstCol; col <= lastCol; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * CITY.cell, firstRow * CITY.cell);
    ctx.lineTo(col * CITY.cell, lastRow * CITY.cell);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(250,244,220,0.35)';
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let col = firstCol; col <= lastCol; col += 1) {
      if (col >= CITY.waterCol && row >= CITY.beachRow - 1) continue;
      const x = col * CITY.cell;
      const y = row * CITY.cell;
      for (let stripe = 0; stripe < 4; stripe += 1) {
        ctx.fillRect(x - half + 5 + stripe * 15, y - half - 5, 9, 4);
        ctx.fillRect(x - half + 5 + stripe * 15, y + half + 1, 9, 4);
        ctx.fillRect(x - half - 5, y - half + 5 + stripe * 15, 4, 9);
        ctx.fillRect(x + half + 1, y - half + 5 + stripe * 15, 4, 9);
      }
    }
  }
}

function drawOpenBlocks(ctx, world, view) {
  for (const park of world.city.parks) {
    if (!visibleBuilding(park, view)) continue;
    ctx.fillStyle = park.district === 'Pine Heights' ? SOLARA.grass : SOLARA.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(park.x + 8, park.y + 8, park.w - 16, park.h - 16);
    ctx.strokeStyle = 'rgba(240,230,190,0.35)';
    ctx.beginPath();
    ctx.moveTo(park.x + 10, park.y + park.h / 2);
    ctx.lineTo(park.x + park.w - 10, park.y + park.h / 2);
    ctx.moveTo(park.x + park.w / 2, park.y + 10);
    ctx.lineTo(park.x + park.w / 2, park.y + park.h - 10);
    ctx.stroke();
  }
  for (const plaza of world.city.plazas) {
    if (!visibleBuilding(plaza, view)) continue;
    ctx.fillStyle = '#cbbfa4';
    ctx.fillRect(plaza.x, plaza.y, plaza.w, plaza.h);
    ctx.strokeStyle = 'rgba(140,125,100,0.35)';
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(plaza.x + (plaza.w / 5) * i, plaza.y);
      ctx.lineTo(plaza.x + (plaza.w / 5) * i, plaza.y + plaza.h);
      ctx.stroke();
    }
  }
}

function drawBuilding(ctx, world, building) {
  const night = isNight(world);
  ctx.fillStyle = SOLARA.shadow;
  ctx.fillRect(building.x + 7, building.y + 8, building.w, building.h);
  ctx.fillStyle = building.wall;
  ctx.fillRect(building.x, building.y, building.w, building.h);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(building.x, building.y, building.w, 5);
  ctx.fillStyle = building.roof;
  const inset = Math.min(10, building.w * 0.12, building.h * 0.12);
  ctx.fillRect(building.x + inset, building.y + inset, building.w - inset * 2, building.h - inset * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fillRect(building.x + inset + 4, building.y + inset + 4, building.w - inset * 2 - 8, 6);
  if (building.detail > 0) {
    ctx.fillStyle = 'rgba(40,45,50,0.28)';
    ctx.fillRect(building.x + building.w * 0.28, building.y + building.h * 0.3, building.w * 0.44, building.h * 0.4);
  }
  if (building.detail > 1) {
    ctx.fillStyle = '#b9c4c2';
    ctx.fillRect(building.x + building.w - 18, building.y + 14, 10, 10);
  }
  const cols = Math.max(1, Math.floor((building.w - 12) / 18));
  const rows = Math.max(1, Math.floor((building.h - 12) / 20));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = building.x + 9 + col * 18;
      const wy = building.y + 10 + row * 20;
      const lit = gridHash(building.seed, row * 31 + col, night ? 3 : 9) > (night ? 0.42 : 0.86);
      ctx.fillStyle = lit ? (night ? SOLARA.litWindow : SOLARA.window) : 'rgba(24,38,48,0.42)';
      ctx.fillRect(wx, wy, 8, 11);
    }
  }
  if (building.sign) {
    ctx.fillStyle = night ? '#ffd779' : '#fff3c4';
    ctx.fillRect(building.x + 8, building.y + building.h - 20, Math.min(building.w - 16, 118), 14);
    ctx.fillStyle = '#24333a';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(building.sign.slice(0, 14), building.x + 12, building.y + building.h - 13);
  }
}

function drawPalm(ctx, item, night, time) {
  const sway = Math.sin(item.phase + time * 1.1) * 0.08;
  const len = 15 * item.size;
  ctx.fillStyle = night ? '#5f4b36' : '#8b6b45';
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.lean * 0.2 + sway);
  ctx.fillRect(-2.5 * item.size, -len, 5 * item.size, len);
  ctx.fillStyle = night ? '#2d6b50' : '#3f9b5a';
  for (let i = 0; i < 7; i += 1) {
    ctx.save();
    ctx.rotate((i / 7) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.quadraticCurveTo(13 * item.size, -len - 8, 21 * item.size, -len + 5);
    ctx.quadraticCurveTo(10 * item.size, -len + 4, 0, -len + 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDecor(ctx, world, view) {
  const night = isNight(world);
  for (const item of world.city.decor) {
    if (item.x < view.x || item.x > view.x + view.w || item.y < view.y || item.y > view.y + view.h) continue;
    if (item.type === 'palm') drawPalm(ctx, item, night, world.elapsed);
    else if (item.type === 'lamp') {
      if (night) {
        const glow = ctx.createRadialGradient(item.x, item.y, 2, item.x, item.y, 96);
        glow.addColorStop(0, 'rgba(255,225,150,0.32)');
        glow.addColorStop(1, 'rgba(255,225,150,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 96, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#4c5b60';
      ctx.fillRect(item.x - 2, item.y - 2, 4, 26);
      ctx.fillStyle = night ? '#ffe7a7' : '#d9e3df';
      ctx.beginPath();
      ctx.arc(item.x, item.y - 3, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'bench') {
      ctx.fillStyle = '#8c6547';
      ctx.fillRect(item.x - 16, item.y - 5, 32, 7);
      ctx.fillRect(item.x - 16, item.y + 4, 32, 4);
    } else if (item.type === 'fountain') {
      ctx.fillStyle = '#c6d9d8';
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3fa4bd';
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.size * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.size * 0.35 + Math.sin(world.elapsed * 3) * 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.type === 'stall') {
      ctx.fillStyle = item.color;
      ctx.fillRect(item.x - 16, item.y - 10, 32, 20);
      ctx.fillStyle = '#f5ecd7';
      ctx.beginPath();
      ctx.moveTo(item.x - 20, item.y - 10);
      ctx.lineTo(item.x, item.y - 20);
      ctx.lineTo(item.x + 20, item.y - 10);
      ctx.fill();
    }
  }
}

function drawTrafficLights(ctx, world, view) {
  const night = isNight(world);
  for (const light of world.city.lights) {
    if (light.x < view.x || light.x > view.x + view.w || light.y < view.y || light.y > view.y + view.h) continue;
    const green = Math.floor(world.elapsed / 9 + light.phase) % 2 === 0;
    const x = light.x + CITY.road / 2 + 10;
    const y = light.y + CITY.road / 2 + 10;
    ctx.fillStyle = '#33424a';
    ctx.fillRect(x - 3, y - 3, 6, 22);
    ctx.fillStyle = green ? '#67d979' : '#ff6b62';
    ctx.beginPath();
    ctx.arc(x, y - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    if (night) {
      ctx.fillStyle = green ? 'rgba(103,217,121,0.16)' : 'rgba(255,107,98,0.16)';
      ctx.beginPath();
      ctx.arc(x, y - 7, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLabels(ctx, world, view) {
  ctx.save();
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const center of world.city.districtCenters) {
    if (center.x < view.x || center.x > view.x + view.w || center.y < view.y || center.y > view.y + view.h) continue;
    ctx.fillStyle = 'rgba(12,30,40,0.26)';
    ctx.fillText(center.name.toUpperCase(), center.x + 2, center.y + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillText(center.name.toUpperCase(), center.x, center.y);
  }
  ctx.restore();
}

export function drawCity(ctx, world, camera) {
  const view = visibleRect(camera, 100);
  drawGround(ctx, world, view);
  drawRoads(ctx, world, view);
  drawOpenBlocks(ctx, world, view);
  for (const building of world.city.buildings) {
    if (visibleBuilding(building, view)) drawBuilding(ctx, world, building);
  }
  drawDecor(ctx, world, view);
  drawTrafficLights(ctx, world, view);
  drawLabels(ctx, world, view);
}
