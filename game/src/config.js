// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  width: 72,
  height: 24,
  speed: 560,
  invulnerable: 1.5,
};

export const LIVES = 3;

export const BLOCK = {
  minWidth: 40,
  maxWidth: 110,
  height: 36,
  speed: 240,
  speedPerLevel: 30,
  speedJitter: 90,
  interval: 0.55,
  intervalScale: 0.88,
  minInterval: 0.14,
  dodgePoints: 1,
};

export const COIN = {
  size: 24,
  speed: 190,
  speedPerLevel: 14,
  interval: 1.4,
  intervalJitter: 0.8,
  points: 10,
};

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 12, max: 12 };

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 64;

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

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'block-dodger.best';

export const CITY = {
  cell: 220,
  road: 64,
  cols: 15,
  rows: 13,
  sidewalk: 14,
  beachRow: 11,
  waterCol: 13,
};

export const FOOT = {
  radius: 11,
  walk: 188,
  run: 292,
  turn: 12,
  punchRange: 34,
  money: 250,
};

export const VEHICLE_TYPES = {
  sedan: { length: 64, width: 32, top: 168, accel: 104, grip: 5.2, brake: 220, mass: 1.1, color: '#d9d6c8' },
  sports: { length: 68, width: 30, top: 268, accel: 168, grip: 4.4, brake: 270, mass: 0.9, color: '#ef5b4c' },
  taxi: { length: 70, width: 33, top: 158, accel: 98, grip: 5.4, brake: 210, mass: 1.2, color: '#f5c542' },
  van: { length: 82, width: 36, top: 138, accel: 76, grip: 4.8, brake: 190, mass: 1.6, color: '#c7d6d0' },
  truck: { length: 104, width: 40, top: 118, accel: 58, grip: 4.0, brake: 160, mass: 2.4, color: '#9ca8ae' },
  cruiser: { length: 68, width: 32, top: 216, accel: 138, grip: 5.6, brake: 250, mass: 1.3, color: '#e9edf1' },
};

export const HOURS_PER_SECOND = 24 / 720;

export const SOLARA = {
  asphalt: '#414b58',
  road: '#4b5562',
  lane: '#eadcae',
  sidewalk: '#bcb7a8',
  curb: '#918f86',
  sand: '#e9cf95',
  surf: '#63c5d6',
  water: '#238eb2',
  deep: '#14617e',
  grass: '#579a5c',
  park: '#62ab68',
  wall: '#d7b78e',
  wallDark: '#b98f6c',
  roof: '#9d6c56',
  roofLight: '#c39576',
  shadow: 'rgba(28,32,42,0.28)',
  window: '#8fd5e4',
  litWindow: '#ffdf8a',
  panel: 'rgba(15,27,38,0.86)',
  panelSolid: '#172634',
  text: '#f8f3e5',
  muted: '#b7c2c9',
  accent: '#ffd166',
  danger: '#ff6c62',
  police: '#4b8fe0',
  money: '#8de08b',
};

export const SCREENS = {
  title: 'title',
  play: 'play',
  paused: 'paused',
  menu: 'menu',
  wasted: 'wasted',
  busted: 'busted',
};

export const DISTRICTS = ['Pine Heights', 'Old Town', 'Downtown', 'Palmside', 'Marina', 'Sunset Quarter'];
