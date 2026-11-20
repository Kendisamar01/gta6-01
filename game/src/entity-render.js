// Drawing for anything that moves. The player's pose is derived from velocity and aim; optional
// pedestrian and vehicle lists are painted if a later system supplies them, which keeps this file
// useful as the game grows without making Stage 1 depend on systems that do not exist yet.
function ellipse(context, color, x, y, radiusX, radiusY) {
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

function drawPerson(context, person, now, player) {
  const shadow = player ? 0.3 : 0.22;
  const x = person.x;
  const y = person.y;
  const step = Math.sin(now * (player ? 11 : 7) + x * 0.08) * Math.min(4, (person.speed || 0) * 0.03);
  ellipse(context, `rgba(18, 24, 32, ${shadow})`, x + 3, y + 5, 11, 6);
  context.save();
  context.translate(x, y);
  context.rotate(person.angle || 0);
  context.fillStyle = player ? '#263b57' : person.color || '#b06d5a';
  context.fillRect(-6, -6 - step, 5, 9);
  context.fillRect(1, -6 + step, 5, 9);
  context.fillStyle = player ? '#e8b96d' : person.shirt || '#8fa7a0';
  context.beginPath();
  context.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = player ? '#d9a86a' : '#d8b394';
  context.beginPath();
  context.arc(2, 0, 5.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = player ? '#2b3442' : '#4a3b34';
  context.beginPath();
  context.arc(3, 0, 4.2, -1.1, 1.1);
  context.fill();
  if (player) {
    context.strokeStyle = '#e8b96d';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(1, -5);
    context.lineTo(13, 0);
    context.stroke();
  }
  context.restore();
}

function drawVehicle(context, vehicle, environment) {
  if (!Number.isFinite(vehicle.x) || !Number.isFinite(vehicle.y)) return;
  const width = vehicle.width || 46;
  const length = vehicle.length || 24;
  const angle = vehicle.angle || 0;
  context.save();
  context.translate(vehicle.x, vehicle.y);
  context.rotate(angle);
  context.fillStyle = 'rgba(18, 24, 32, 0.28)';
  context.fillRect(-width / 2 + 4, -length / 2 + 5, width, length);
  context.fillStyle = vehicle.color || '#c65b52';
  context.fillRect(-width / 2, -length / 2, width, length);
  context.fillStyle = '#30495b';
  context.fillRect(-width * 0.16, -length / 2 + 3, width * 0.46, length - 6);
  context.fillStyle = '#1e2b36';
  context.fillRect(-width / 2 + 2, -length / 2 + 2, 5, length - 4);
  context.fillStyle = environment.state.night > 0.35 ? '#ffe9a8' : '#f6f1d8';
  context.fillRect(width / 2 - 3, -length / 2 + 2, 3, 5);
  context.fillRect(width / 2 - 3, length / 2 - 7, 3, 5);
  context.restore();
}

function drawMarker(context, marker, now) {
  const pulse = 1 + Math.sin(now * 4) * 0.09;
  context.save();
  context.translate(marker.x, marker.y);
  context.scale(pulse, pulse);
  context.fillStyle = 'rgba(255, 206, 92, 0.18)';
  context.beginPath();
  context.arc(0, 0, 40, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#ffd25e';
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, 26, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#ffd25e';
  context.beginPath();
  context.moveTo(0, 6);
  context.lineTo(-9, -8);
  context.lineTo(9, -8);
  context.closePath();
  context.fill();
  context.restore();
}

export function drawPlayer(context, player, now) {
  if (player.wasted) return;
  if (player.inVehicle) return;
  drawPerson(context, player, now, true);
  context.save();
  context.strokeStyle = 'rgba(255, 247, 210, 0.7)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(player.x, player.y, 15, -0.5, 0.5);
  context.stroke();
  context.restore();
}

/** Paint optional entities first, then the player, then any objective marker above them. */
export function drawEntities(context, state, environment, now) {
  if (Array.isArray(state.peds)) {
    for (let index = 0; index < state.peds.length; index += 1) {
      const ped = state.peds[index];
      if (ped && ped.inVehicle) continue;
      if (ped && !ped.dead) drawPerson(context, ped, now, false);
    }
  }
  if (Array.isArray(state.vehicles)) {
    for (let index = 0; index < state.vehicles.length; index += 1) {
      const vehicle = state.vehicles[index];
      if (vehicle) drawVehicle(context, vehicle, environment);
    }
  }
  drawPlayer(context, state.player, now);
  if (state.mission && state.mission.marker) drawMarker(context, state.mission.marker, now);
}
