export const STEP = 1 / 60;

export const VIEW = Object.freeze({ width: 1280, height: 720 });

export const GRID = Object.freeze({
  first: 160,
  step: 220,
  road: 56,
  sidewalk: 18,
  columns: 16,
  rows: 12,
});

export const WORLD = Object.freeze({
  width: 3520,
  height: 2960,
  beachY: 2600,
  waterY: 2760,
});

export const DAY_LENGTH = 300;

export const COLORS = Object.freeze({
  sand: '#e7d2a3',
  sandDark: '#d8bd86',
  grass: '#6d9a5b',
  grassDark: '#517c46',
  asphalt: '#40444e',
  asphaltDark: '#343841',
  lane: '#e9d8a6',
  sidewalk: '#c6c0ae',
  curb: '#a49f90',
  water: '#2b83a0',
  waterDeep: '#1e647e',
  foam: '#e8f2e8',
  ink: '#16222c',
  paper: '#f5f2e6',
  gold: '#ffcf62',
  red: '#ef5f56',
  cyan: '#63dce6',
  green: '#7ed67b',
});

export const BUILDING_COLORS = Object.freeze([
  '#d9a978', '#c98f70', '#e3c391', '#b78472', '#d6b0a0', '#9e9b8e',
  '#b6a68d', '#c3a37f', '#a8b0a8', '#d7bd9e', '#e0d2b4', '#b9977c',
  '#a6a49a', '#cf9f81',
]);

export const FONT = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

export const VEHICLE_TYPES = Object.freeze({
  sedan: {
    label: 'Lumen 6', length: 46, width: 24, maxSpeed: 232, accel: 150,
    brake: 260, grip: 7.2, turn: 2.6, mass: 1, hp: 100, price: 420, horn: 330,
  },
  sports: {
    label: 'Vesper GT', length: 48, width: 23, maxSpeed: 328, accel: 225,
    brake: 300, grip: 8.4, turn: 3.05, mass: 0.9, hp: 85, price: 950, horn: 520,
  },
  taxi: {
    label: 'Sunbeam Cab', length: 49, width: 25, maxSpeed: 205, accel: 140,
    brake: 240, grip: 6.8, turn: 2.5, mass: 1.15, hp: 110, price: 520, horn: 400,
  },
  van: {
    label: 'Tidewater Van', length: 58, width: 27, maxSpeed: 185, accel: 120,
    brake: 220, grip: 6.1, turn: 2.2, mass: 1.5, hp: 135, price: 610, horn: 260,
  },
  truck: {
    label: 'Anvil Hauler', length: 74, width: 31, maxSpeed: 165, accel: 95,
    brake: 190, grip: 5.2, turn: 1.75, mass: 2.4, hp: 180, price: 880, horn: 190,
  },
  police: {
    label: 'Warden CR', length: 50, width: 25, maxSpeed: 282, accel: 195,
    brake: 285, grip: 8.1, turn: 2.9, mass: 1.15, hp: 125, price: 0, horn: 610,
  },
});

export const WEAPONS = Object.freeze({
  fists: Object.freeze({ name: 'Fists', damage: 19, delay: 0.42, range: 44 }),
  pistol: Object.freeze({ name: 'Pistol', damage: 34, delay: 0.21, range: 620, clip: 12, reload: 1.15 }),
});

export const WANTED_THRESHOLDS = Object.freeze([0, 34, 82, 148, 236, 340]);

export const SAVE_KEY = 'solara-bay.save.v1';
