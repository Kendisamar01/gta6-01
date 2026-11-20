import { PALETTE, VIEW, WORLD } from './config.js';

export function createMinimap(world) {
  const city = world.city;
  const scale = 0.34;
  const box = { x: VIEW.width - 306, y: 22, w: 282, h: 206 };

  function draw(context) {
    const player = world.state.player;
    context.save();
    context.fillStyle = 'rgba(9,20,30,0.88)';
    context.fillRect(box.x, box.y, box.w, box.h);
    context.strokeStyle = 'rgba(242,181,68,0.75)';
    context.lineWidth = 2;
    context.strokeRect(box.x, box.y, box.w, box.h);
    context.save();
    context.beginPath();
    context.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6);
    context.clip();
    context.translate(box.x + box.w / 2 - player.x * scale, box.y + box.h / 2 - player.y * scale);
    context.scale(scale, scale);

    context.fillStyle = '#a49a7c';
    context.fillRect(player.x - 500, player.y - 400, 1000, 800);
    context.fillStyle = '#deb887';
    context.fillRect(player.x - 500, WORLD.beachTop, 1000, WORLD.waterTop - WORLD.beachTop);
    context.fillStyle = PALETTE.water;
    context.fillRect(player.x - 500, WORLD.waterTop, 1000, 500);

    context.fillStyle = '#545b62';
    for (const roadY of city.roadsY) {
      if (Math.abs(roadY - player.y) > 380) continue;
      context.fillRect(player.x - 500, roadY - WORLD.roadWidth / 2, 1000, WORLD.roadWidth);
    }
    for (const roadX of city.roadsX) {
      if (Math.abs(roadX - player.x) > 500) continue;
      context.fillRect(roadX - WORLD.roadWidth / 2, player.y - 400, WORLD.roadWidth, 800);
    }
    context.fillStyle = '#667d61';
    for (const park of city.parks) {
      if (Math.abs(park.x - player.x) > 500 || Math.abs(park.y - player.y) > 380) continue;
      context.fillRect(park.x, park.y, park.w, park.h);
    }
    context.fillStyle = '#303c48';
    for (const building of city.buildings) {
      if (Math.abs(building.x - player.x) > 500 || Math.abs(building.y - player.y) > 380) continue;
      context.fillRect(building.x, building.y, building.w, building.h);
    }

    context.fillStyle = '#bd4e46';
    context.beginPath();
    context.arc(city.garage.x, city.garage.y, 26, 0, Math.PI * 2);
    context.fill();
    for (const marker of world.state.markers) {
      context.fillStyle = marker.color ?? PALETTE.accent;
      context.beginPath();
      context.arc(marker.x, marker.y, 28, 0, Math.PI * 2);
      context.fill();
    }
    for (const car of world.state.policeCars) {
      context.fillStyle = '#5b9df0';
      context.fillRect(car.x - 12, car.y - 12, 24, 24);
    }
    context.restore();

    const arrowX = box.x + box.w / 2;
    const arrowY = box.y + box.h / 2;
    context.save();
    context.translate(arrowX, arrowY);
    context.rotate(player.aim);
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#12202c';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(11, 0);
    context.lineTo(-8, -7);
    context.lineTo(-4, 0);
    context.lineTo(-8, 7);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
    context.restore();
    context.fillStyle = PALETTE.text;
    context.font = '12px sans-serif';
    context.textAlign = 'left';
    context.fillText(city.districtAt(player.x, player.y), box.x + 8, box.y + box.h + 17);
  }

  return { draw, box };
}
