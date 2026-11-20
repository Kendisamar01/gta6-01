import { CITY } from './config.js';
import { driveVehicle } from './vehicles.js';

function wrap(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function laneSteering(car) {
  const horizontal = Math.abs(Math.cos(car.angle)) >= Math.abs(Math.sin(car.angle));
  if (horizontal) {
    const direction = Math.cos(car.angle) >= 0 ? 1 : -1;
    const road = Math.round(car.y / CITY.cell) * CITY.cell;
    const lane = road + direction * CITY.road / 4;
    const heading = direction > 0 ? 0 : Math.PI;
    return Math.max(-1, Math.min(1, (lane - car.y) / 65 - wrap(heading - car.angle) * 0.7));
  }
  const direction = Math.sin(car.angle) >= 0 ? 1 : -1;
  const road = Math.round(car.x / CITY.cell) * CITY.cell;
  const lane = road + direction * CITY.road / 4;
  const heading = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
  return Math.max(-1, Math.min(1, -direction * ((lane - car.x) / 65) + wrap(heading - car.angle) * 0.7));
}

function redAhead(world, car) {
  const horizontal = Math.abs(Math.cos(car.angle)) >= Math.abs(Math.sin(car.angle));
  const direction = horizontal ? (Math.cos(car.angle) >= 0 ? 1 : -1) : (Math.sin(car.angle) >= 0 ? 1 : -1);
  const along = horizontal ? car.x : car.y;
  const crossing = Math.round(along / CITY.cell) * CITY.cell;
  const distance = (crossing - along) * direction;
  if (distance < 0 || distance > 125) return false;
  const crossIndex = Math.round((horizontal ? car.y : car.x) / CITY.cell);
  const light = world.city.lights.find((item) => {
    const alongLight = horizontal ? item.x : item.y;
    const acrossLight = horizontal ? item.y : item.x;
    return Math.abs(alongLight - crossing) < 2 && Math.abs(acrossLight - crossIndex * CITY.cell) < 2;
  });
  if (!light) return false;
  return Math.floor(world.elapsed / 9 + light.phase) % 2 === 1;
}

function blockedAhead(world, car) {
  const forwardX = Math.cos(car.angle);
  const forwardY = Math.sin(car.angle);
  for (const other of world.vehicles) {
    if (other === car || other.dead || other.driver === 'parked') continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * forwardX + dy * forwardY;
    const side = Math.abs(-dx * forwardY + dy * forwardX);
    if (ahead > 5 && ahead < 95 && side < 26) return true;
  }
  return false;
}

export function update(world, dt, api) {
  for (const car of world.vehicles) {
    if (car.dead || car.driver !== 'traffic') continue;
    const steer = laneSteering(car);
    const stopping = redAhead(world, car) || blockedAhead(world, car);
    const throttle = stopping ? (car.speed > 20 ? -1 : 0) : 0.72;
    driveVehicle(world, car, throttle, steer, false, dt, api);
  }
}
