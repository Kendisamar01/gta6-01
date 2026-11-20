import { PALETTE, VIEW, WORLD } from './config.js';

const SIGNS = ['OASIS', 'BAY 9', 'DEL SOL', 'PIER 7', 'NOVA', 'MARÉ'];

function visible(item, view, margin = 80) {
  return item.x + (item.w ?? 0) > view.left - margin && item.x < view.right + margin
    && item.y + (item.h ?? 0) > view.top - margin && item.y < view.bottom + margin;
}

function palm(context, x, y, scale, night) {
  context.fillStyle = 'rgba(20,32,32,0.22)';
  context.beginPath();
  context.ellipse(x + 6 * scale, y + 7 * scale, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#8a6a43';
  context.fillRect(x - 2.5 * scale, y - 3 * scale, 5 * scale, 16 * scale);
  const leaves = night > 0.4 ? ['#2c6b54', '#23604b'] : ['#4ca06c', '#37885b'];
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    context.fillStyle = leaves[index % 2];
    context.beginPath();
    context.ellipse(x + Math.cos(angle) * 9 * scale, y - 5 * scale + Math.sin(angle) * 6 * scale,
      13 * scale, 4 * scale, angle, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = '#d7b46a';
  context.fillRect(x - 2 * scale, y - 7 * scale, 4 * scale, 4 * scale);
}

function lamp(context, x, y, night) {
  context.fillStyle = '#4a5560';
  context.fillRect(x - 2, y - 3, 4, 12);
  if (night > 0.2) {
    const gradient = context.createRadialGradient(x, y - 5, 2, x, y - 5, 86);
    gradient.addColorStop(0, `rgba(255,224,150,${0.34 * night})`);
    gradient.addColorStop(1, 'rgba(255,224,150,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y - 5, 86, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = night > 0.2 ? '#ffe6a0' : '#b9c0bd';
  context.fillRect(x - 4, y - 7, 8, 5);
}

function drawBuilding(context, building, night) {
  const shadow = Math.min(18, building.floors * 1.4);
  context.fillStyle = 'rgba(23,31,40,0.3)';
  context.fillRect(building.x + shadow, building.y + shadow, building.w, building.h);
  context.fillStyle = building.color;
  context.fillRect(building.x, building.y, building.w, building.h);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(building.x, building.y, building.w, 4);
  context.fillStyle = 'rgba(0,0,0,0.22)';
  context.fillRect(building.x + building.w - 5, building.y, 5, building.h);
  context.fillRect(building.x, building.y + building.h - 5, building.w, 5);

  if (building.floors > 2) {
    context.fillStyle = night > 0.4 ? 'rgba(255,218,143,0.7)' : 'rgba(32,58,80,0.36)';
    const step = 13;
    for (let x = building.x + 8; x < building.x + building.w - 8; x += step) {
      context.fillRect(x, building.y + 7, 5, 3);
      context.fillRect(x, building.y + building.h - 10, 5, 3);
    }
  }
  context.fillStyle = 'rgba(20,28,36,0.3)';
  if (building.roof === 0) {
    context.fillRect(building.x + building.w * 0.3, building.y + building.h * 0.3, building.w * 0.36, building.h * 0.3);
  } else if (building.roof === 1) {
    context.fillRect(building.x + 8, building.y + 12, Math.max(6, building.w * 0.22), Math.max(6, building.h * 0.22));
  } else if (building.roof === 2) {
    context.strokeStyle = 'rgba(230,238,240,0.35)';
    context.lineWidth = 2;
    context.strokeRect(building.x + 7, building.y + 7, building.w - 14, building.h - 14);
  }
  if (building.sign >= 0) {
    context.fillStyle = '#173d52';
    context.fillRect(building.x + 6, building.y + building.h * 0.45, building.w - 12, 15);
    context.fillStyle = '#f6d583';
    context.font = '9px "Trebuchet MS", sans-serif';
    context.textAlign = 'center';
    context.fillText(SIGNS[building.sign % SIGNS.length], building.x + building.w / 2, building.y + building.h * 0.45 + 11);
  }
}

function drawRoads(context, city, view) {
  context.fillStyle = PALETTE.road;
  for (const roadY of city.roadsY) {
    if (roadY < view.top - WORLD.roadWidth || roadY > view.bottom + WORLD.roadWidth) continue;
    context.fillRect(0, roadY - WORLD.roadWidth / 2, WORLD.width, WORLD.roadWidth);
  }
  for (const roadX of city.roadsX) {
    if (roadX < view.left - WORLD.roadWidth || roadX > view.right + WORLD.roadWidth) continue;
    context.fillRect(roadX - WORLD.roadWidth / 2, 0, WORLD.roadWidth, WORLD.waterTop);
  }

  context.fillStyle = 'rgba(228,220,182,0.52)';
  for (const roadY of city.roadsY) {
    if (roadY < view.top - 40 || roadY > view.bottom + 40) continue;
    for (let x = 0; x < WORLD.width; x += 62) {
      if (city.roadsX.some((rx) => Math.abs(x - rx) < 62)) continue;
      context.fillRect(x, roadY - 1.5, 30, 3);
    }
  }
  for (const roadX of city.roadsX) {
    if (roadX < view.left - 40 || roadX > view.right + 40) continue;
    for (let y = 0; y < WORLD.waterTop; y += 62) {
      if (city.roadsY.some((ry) => Math.abs(y - ry) < 62)) continue;
      context.fillRect(roadX - 1.5, y, 3, 30);
    }
  }

  context.fillStyle = 'rgba(244,240,220,0.55)';
  for (const roadX of city.roadsX) {
    if (roadX < view.left - 80 || roadX > view.right + 80) continue;
    for (const roadY of city.roadsY) {
      if (roadY < view.top - 80 || roadY > view.bottom + 80) continue;
      for (let stripe = 0; stripe < 4; stripe += 1) {
        const offset = -27 + stripe * 15;
        context.fillRect(roadX + offset, roadY - WORLD.roadWidth / 2 - 5, 9, 5);
        context.fillRect(roadX + offset, roadY + WORLD.roadWidth / 2, 9, 5);
        context.fillRect(roadX - WORLD.roadWidth / 2 - 5, roadY + offset, 5, 9);
        context.fillRect(roadX + WORLD.roadWidth / 2, roadY + offset, 5, 9);
      }
    }
  }
}

function drawWater(context, view, environment) {
  context.fillStyle = '#e2c99b';
  context.fillRect(0, WORLD.beachTop, WORLD.width, WORLD.waterTop - WORLD.beachTop);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = 0; x < WORLD.width; x += 34) context.fillRect(x, WORLD.beachTop + 12, 18, 3);
  context.fillStyle = PALETTE.foam;
  context.fillRect(0, WORLD.waterTop - 6, WORLD.width, 8);

  const gradient = context.createLinearGradient(0, WORLD.waterTop, 0, WORLD.height);
  gradient.addColorStop(0, PALETTE.water);
  gradient.addColorStop(1, PALETTE.waterDeep);
  context.fillStyle = gradient;
  context.fillRect(0, WORLD.waterTop, WORLD.width, WORLD.height - WORLD.waterTop);
  context.strokeStyle = 'rgba(231,251,247,0.28)';
  context.lineWidth = 2;
  for (let row = 0; row < 7; row += 1) {
    const baseY = WORLD.waterTop + 32 + row * 46;
    context.beginPath();
    for (let x = Math.max(0, view.left - 40); x < Math.min(WORLD.width, view.right + 40); x += 18) {
      const y = baseY + Math.sin((x + environment.drift * 60 + row * 40) / 58) * 5;
      if (x === Math.max(0, view.left - 40)) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
}

function drawParks(context, city, view, environment) {
  for (const park of city.parks) {
    if (!visible(park, view)) continue;
    context.fillStyle = '#7f9d68';
    context.fillRect(park.x, park.y, park.w, park.h);
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(park.x, park.y, park.w, 5);
    for (let index = 0; index < park.trees; index += 1) {
      const x = park.x + 20 + ((index * 47) % Math.max(24, park.w - 40));
      const y = park.y + 20 + ((index * 71) % Math.max(24, park.h - 40));
      context.fillStyle = 'rgba(24,40,28,0.25)';
      context.beginPath();
      context.arc(x + 4, y + 4, 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = environment.lightsOn ? '#396b4b' : '#4f915d';
      context.beginPath();
      context.arc(x, y, 12, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawSignals(context, city, view, environment) {
  for (const signal of city.lights) {
    if (signal.x < view.left - 30 || signal.x > view.right + 30 || signal.y < view.top - 30 || signal.y > view.bottom + 30) continue;
    const cycle = Math.floor((environment.drift * 0.55 + signal.offset) % 4);
    const greenNS = (cycle + signal.phase) % 2 === 0;
    context.fillStyle = '#26333b';
    context.fillRect(signal.x - WORLD.roadWidth / 2 - 5, signal.y - WORLD.roadWidth / 2 - 5, 8, 16);
    context.fillStyle = greenNS ? '#82e29a' : '#e85f52';
    context.fillRect(signal.x - WORLD.roadWidth / 2 - 4, signal.y - WORLD.roadWidth / 2 - 4, 6, 5);
    context.fillStyle = greenNS ? '#e85f52' : '#82e29a';
    context.fillRect(signal.x - WORLD.roadWidth / 2 - 4, signal.y - WORLD.roadWidth / 2 + 3, 6, 5);
  }
}

export function drawCity(context, city, camera, environment) {
  const view = { left: camera.x - VIEW.width / 2, right: camera.x + VIEW.width / 2, top: camera.y - VIEW.height / 2, bottom: camera.y + VIEW.height / 2 };
  const night = environment.night();

  context.fillStyle = PALETTE.land;
  context.fillRect(view.left - 10, view.top - 10, VIEW.width + 20, VIEW.height + 20);
  drawWater(context, view, environment);
  drawRoads(context, city, view);
  drawParks(context, city, view, environment);

  for (const building of city.buildings) if (visible(building, view)) drawBuilding(context, building, night);

  for (const prop of city.props) {
    if (prop.x < view.left - 40 || prop.x > view.right + 40 || prop.y < view.top - 40 || prop.y > view.bottom + 40) continue;
    if (prop.kind === 'palm') palm(context, prop.x, prop.y, prop.scale, night);
    else if (prop.kind === 'lamp') lamp(context, prop.x, prop.y, night);
    else if (prop.kind === 'bench') {
      context.fillStyle = '#8d6748';
      context.fillRect(prop.x - 9, prop.y - 3, 18, 6);
    }
  }

  if (night > 0.02) {
    context.fillStyle = `rgba(12,26,58,${night * 0.42})`;
    context.fillRect(view.left - 10, view.top - 10, VIEW.width + 20, VIEW.height + 20);
    for (const prop of city.props) {
      if (prop.kind !== 'lamp') continue;
      if (prop.x < view.left - 90 || prop.x > view.right + 90 || prop.y < view.top - 90 || prop.y > view.bottom + 90) continue;
      lamp(context, prop.x, prop.y, night);
    }
  }
  drawSignals(context, city, view, environment);
}
