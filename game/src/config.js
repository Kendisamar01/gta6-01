export const TICK = 1 / 60;

export const SCREEN = Object.freeze({ width: 1280, height: 720 });

export const MAP = Object.freeze({
  first: 160,
  step: 220,
  road: 56,
  walk: 18,
  columns: 16,
  rows: 12,
  width: 3520,
  height: 2960,
  sandLine: 2600,
  seaLine: 2760,
});

export const DAY_SECONDS = 300;

export const PALETTE = Object.freeze({
  sand: '#e8d3a6',
  sandShade: '#d6bb88',
  lawn: '#719c58',
  lawnShade: '#4f7b45',
  tarmac: '#42464f',
  tarmacEdge: '#343840',
  stripe: '#ead9a9',
  pavement: '#c7c2b0',
  kerb: '#a39e90',
  sea: '#2d85a2',
  seaDeep: '#1d637e',
  surf: '#e9f3ea',
  ink: '#16222c',
  cream: '#f6f2e5',
  amber: '#ffd06a',
  coral: '#ef6058',
  aqua: '#65dce5',
  mint: '#82d77f',
});

export const ROOF_COLORS = Object.freeze([
  '#d9aa7a', '#c99172', '#e5c493', '#b88775', '#d4b1a1', '#a09d90',
  '#b9a990', '#c5a581', '#aab2aa', '#d8bea0', '#e2d4b7', '#ba997e',
  '#a8a69c', '#d1a183',
]);

export const TYPEFACE = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
export const FONT = TYPEFACE;

export const CAR_SPECS = Object.freeze({
  sedan: {
    label: 'Cinder 6', length: 46, width: 24, maxSpeed: 232, accel: 150,
    brake: 260, grip: 7.2, turn: 2.6, mass: 1, hp: 100, price: 420, horn: 330,
  },
  sports: {
    label: 'Vega RS', length: 48, width: 23, maxSpeed: 328, accel: 225,
    brake: 300, grip: 8.4, turn: 3.05, mass: 0.9, hp: 85, price: 950, horn: 520,
  },
  taxi: {
    label: 'Sunfare Cab', length: 49, width: 25, maxSpeed: 205, accel: 140,
    brake: 240, grip: 6.8, turn: 2.5, mass: 1.15, hp: 110, price: 520, horn: 400,
  },
  van: {
    label: 'Breakwater Van', length: 58, width: 27, maxSpeed: 185, accel: 120,
    brake: 220, grip: 6.1, turn: 2.2, mass: 1.5, hp: 135, price: 610, horn: 260,
  },
  truck: {
    label: 'Goliath Hauler', length: 74, width: 31, maxSpeed: 165, accel: 95,
    brake: 190, grip: 5.2, turn: 1.75, mass: 2.4, hp: 180, price: 880, horn: 190,
  },
  police: {
    label: 'Warden Interceptor', length: 50, width: 25, maxSpeed: 282, accel: 195,
    brake: 285, grip: 8.1, turn: 2.9, mass: 1.15, hp: 125, price: 0, horn: 610,
  },
});

export const GUNS = Object.freeze({
  fists: Object.freeze({ label: 'Fists', damage: 19, delay: 0.42, reach: 44 }),
  pistol: Object.freeze({
    label: 'Sidearm', damage: 34, delay: 0.21, reach: 620, clip: 12, reload: 1.15,
  }),
});

export const STAR_STEPS = Object.freeze([0, 34, 82, 148, 236, 340]);

export const SAVE_ID = 'solara-bay/progress-2';
