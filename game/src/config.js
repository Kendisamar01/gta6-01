export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

export const WORLD = {
  width: 6400,
  height: 4800,
  spacing: 320,
  firstRoad: 160,
  roadWidth: 72,
  sidewalk: 18,
  beachTop: 4160,
  waterTop: 4480,
};

export const PLAYER = {
  radius: 16,
  walkSpeed: 190,
  runSpeed: 305,
  health: 100,
  armor: 100,
  punchDamage: 14,
  punchRange: 42,
  respawnDelay: 2.4,
};

export const VEHICLE_TYPES = [
  { id: 'sedan', name: 'Solace Sedan', top: 300, accel: 155, grip: 4.8, length: 78, width: 40, mass: 1, color: '#4f7fb8' },
  { id: 'sport', name: 'Vesper GT', top: 430, accel: 250, grip: 5.6, length: 84, width: 40, mass: 0.9, color: '#d94c55' },
  { id: 'taxi', name: 'Sunline Cab', top: 285, accel: 145, grip: 4.5, length: 82, width: 42, mass: 1.1, color: '#e5b63e' },
  { id: 'van', name: 'Cargo Loaf', top: 245, accel: 120, grip: 3.9, length: 98, width: 46, mass: 1.5, color: '#a8b2bd' },
  { id: 'truck', name: 'Haulmaster', top: 225, accel: 95, grip: 3.2, length: 124, width: 52, mass: 2.2, color: '#7c8b9e' },
  { id: 'police', name: 'City Enforcer', top: 355, accel: 205, grip: 5.2, length: 86, width: 42, mass: 1.2, color: '#243a5e' },
];

export const WEAPONS = {
  fists: { name: 'Fists', damage: 14, range: 44, ammo: Infinity, rate: 0.42, speed: 0 },
  pistol: { name: 'P-9 Sidearm', damage: 28, range: 720, ammo: 12, rate: 0.19, speed: 1050 },
  smg: { name: 'Tide SMG', damage: 18, range: 620, ammo: 32, rate: 0.085, speed: 980 },
};

export const DISTRICTS = [
  { name: 'Downtown', color: '#3c5876' },
  { name: 'Old Town', color: '#795d55' },
  { name: 'Palmside', color: '#4f7a5d' },
  { name: 'Marina', color: '#3c7181' },
  { name: 'Industrial', color: '#77706a' },
  { name: 'Suburbs', color: '#8a815f' },
  { name: 'Sunstrand Beach', color: '#c8a875' },
];

export const PALETTE = {
  land: '#c8b995',
  road: '#40454c',
  roadLine: '#d9d2b0',
  walk: '#a8a087',
  water: '#1c7895',
  waterDeep: '#125c7a',
  foam: '#e9f6ef',
  ink: '#14202c',
  text: '#f6f3e8',
  muted: '#aab8c4',
  accent: '#f2b544',
  danger: '#e35b4f',
  good: '#6dd49a',
  panel: 'rgba(14, 24, 36, 0.9)',
};

export const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
export const SAVE_KEY = 'solara-bay.save.v1';
export const BEST_KEY = 'solara-bay.best.v1';
