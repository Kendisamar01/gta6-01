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

/** The logical canvas stays 1280x720; the simulated city is much larger than one screen. */
export const VIEW = { width: FIELD.width, height: FIELD.height };

/** Grid geometry, in world pixels. Roads run along every grid line. */
export const CITY = {
  cell: 128,
  road: 32,
  grid: 34,
  sidewalk: 10,
  lotPadding: 15,
  minBuilding: 26,
  shoreRow: 30,
  bayColumn: 30,
  bayRow: 20,
};

/** A person on foot: radius for collisions, walk/run speeds and starting vitals. */
export const FOOT = {
  radius: 10,
  speed: 150,
  runSpeed: 250,
  accel: 13,
  drag: 11,
  health: 100,
  armor: 0,
  money: 250,
  respawn: 2.2,
};

/**
 * District rectangles are given in grid cells. They only decide what gets built and which name
 * appears; the road grid itself is shared by the whole map.
 */
export const DISTRICTS = [
  { name: 'Old Town', column: [1, 10], row: [2, 13], style: 'old', tint: '#c98f6b', density: 0.86 },
  { name: 'Downtown', column: [11, 21], row: [3, 16], style: 'tower', tint: '#7fa6bf', density: 0.96 },
  { name: 'Suburbs', column: [22, 33], row: [1, 11], style: 'house', tint: '#d7b98a', density: 0.62 },
  { name: 'Palmside', column: [1, 12], row: [14, 24], style: 'palm', tint: '#8fbb82', density: 0.7 },
  { name: 'Marina', column: [13, 29], row: [17, 28], style: 'marina', tint: '#8bb9c8', density: 0.8 },
  { name: 'Ironworks', column: [22, 29], row: [12, 16], style: 'industrial', tint: '#a89a83', density: 0.74 },
  { name: 'Sundrift Beach', column: [1, 21], row: [25, 29], style: 'beach', tint: '#e4c98f', density: 0.55 },
];

/** Surface colours. Warm, high-contrast tones keep the city readable from above. */
export const COLORS = {
  grass: '#79a961',
  park: '#65a45a',
  sand: '#ead7a4',
  wetSand: '#d9c18d',
  water: '#319ebc',
  waterDeep: '#207a9d',
  foam: '#d8f1ef',
  road: '#41464c',
  roadShade: '#363b41',
  lane: '#e7d59a',
  sidewalk: '#c9c1ae',
  curb: '#a9a08f',
  crosswalk: '#efe7d2',
  shadow: 'rgba(24, 28, 35, 0.26)',
  window: '#ffe9a8',
  windowDark: '#547080',
  palm: '#3f7d4d',
  palmDark: '#2c5e3c',
  trunk: '#8b6b47',
  lamp: '#f7dc93',
  concrete: '#b4ada0',
};

/** Building wall colours, indexed by a cell's seeded number. */
export const FACADES = {
  old: ['#c98a6e', '#d8a77f', '#b97868', '#d7bd93', '#b98b7b'],
  tower: ['#7e9cb1', '#68869e', '#93aab6', '#5f778f', '#a0b0b7'],
  house: ['#e2c793', '#d5a97b', '#c8d3b5', '#e0b7a3', '#b8c8d4'],
  palm: ['#d8caa0', '#c9d6b0', '#e0c6a6', '#b7c9b4', '#d5b99c'],
  marina: ['#a8c4cd', '#9bb3c0', '#c9d2cf', '#84a7b8', '#b6c7c1'],
  industrial: ['#a9a396', '#9b9c9a', '#beb09b', '#8e9698', '#b5aa94'],
  beach: ['#e5d1a4', '#edd6ae', '#d9c79a', '#e8cba3', '#cdd8c1'],
};

/** The clock starts mid-morning and takes ten real minutes for a full day. */
export const DAY_LENGTH = 600;
export const DAY_START = 0.33;

