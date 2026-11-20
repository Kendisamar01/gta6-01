// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const PALETTE = {
  backdrop: '#11141b',
  sky: '#1b1f2a',
  ground: '#2a3040',
  player: '#4fc3f7',
  block: '#e5534b',
  coin: '#f2c94c',
  panel: '#252b38',
  text: '#eef1f5',
  muted: '#8b93a3',
};

export const CITY_NAME = 'Solara Bay';

export const BEST_KEY = 'solara-bay.best';

export const WORLD = {
  cols: 14,
  rows: 11,
  cell: 360,
  road: 88,
  beach: 0.52,
  width: 14 * 360,
  height: 11 * 360,
  shoreY: 10 * 360 + 360 * 0.52,
};

export const WALKER = {
  radius: 12,
  walk: 190,
  run: 315,
  startX: 6 * 360,
  startY: 4 * 360,
  health: 100,
  armor: 0,
  cash: 250,
};

export const PLAYER = {
  width: 24,
  height: 24,
  speed: 190,
  invulnerable: 0,
};

export const CAMERA = {
  look: 0.3,
  aim: 0.14,
  ease: 7,
  shakeDecay: 6,
};

export const DAY = {
  length: 210,
  start: 0.34,
};

export const COLORS = {
  grass: '#7ea763',
  lawn: '#8fb873',
  park: '#6fa45b',
  sand: '#e8d4a1',
  water: '#2a8fb0',
  waterDeep: '#1d6d8d',
  foam: '#d7f2f3',
  sidewalk: '#c9c4b4',
  curb: '#a9a497',
  asphalt: '#414750',
  asphaltDark: '#363b43',
  lane: '#efe4b8',
  crosswalk: '#e6e6dd',
  tree: '#3f7c48',
  palm: '#2f7355',
  trunk: '#8b6b46',
  lamp: '#ffe9a8',
  shadow: 'rgba(24, 32, 38, 0.28)',
  night: 'rgba(18, 28, 62, 0.46)',
  downtown: ['#c8b79f', '#b9a98f', '#d0c3ad', '#a99b86'],
  marina: ['#d6c9b0', '#c4b495', '#e0d4bd'],
  palmside: ['#eadfc6', '#dcc9a6', '#f0e6d2'],
  oldtown: ['#c9a98f', '#b8947c', '#d8bda3'],
  industrial: ['#9fa5a5', '#8e9698', '#b0b5b3'],
  suburbs: ['#d9c5a6', '#e6d5b8', '#cbb594'],
  roof: ['#8d6a58', '#6f7b74', '#9b8365', '#7a6b6a', '#a1947b'],
};
