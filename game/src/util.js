export const TAU = Math.PI * 2;

export function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function wrapAngle(angle) {
  let result = angle;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
}

export function angleDelta(from, to) {
  return wrapAngle(to - from);
}

export function approach(value, target, amount) {
  if (value < target) return Math.min(target, value + amount);
  if (value > target) return Math.max(target, value - amount);
  return target;
}

export function circleTouchesRect(x, y, radius, rect) {
  const nearX = Math.min(rect.x + rect.width, Math.max(rect.x, x));
  const nearY = Math.min(rect.y + rect.height, Math.max(rect.y, y));
  return distanceSq(x, y, nearX, nearY) < radius * radius;
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function smooth(amount) {
  const t = clamp(amount, 0, 1);
  return t * t * (3 - 2 * t);
}

export function compass(angle) {
  const names = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const index = Math.round(((angle % TAU) + TAU) % TAU / (TAU / 8)) % 8;
  return names[index];
}

export function money(value) {
  return `$${Math.max(0, Math.round(value)).toLocaleString('en-US')}`;
}
