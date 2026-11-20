import { WORLD } from './config.js';

export function spot(col, row, dx = 0, dy = 0) {
  return { x: (col + 0.5) * WORLD.cell + dx, y: (row + 0.5) * WORLD.cell + dy };
}

export const CHARACTERS = {
  maro: 'Maro Reyes',
  mira: 'Mira Vela',
  harlan: 'Detective Harlan Cross',
  tess: 'Tess Aoki',
  rook: 'Rook',
};

export const MISSIONS = [
  {
    id: 'tidewater',
    title: 'Tidewater Hello',
    client: CHARACTERS.maro,
    brief: [
      'Maro: You made it. Solara Bay smells like salt and bad decisions.',
      'Maro: Walk down to the pier. I left something in a locker for you.',
    ],
    reward: 400,
    respect: 4,
    steps: [
      { kind: 'goto', target: spot(6, 5, 40, 0), radius: 64, text: 'Meet Maro by the Sunstrand pier.', line: 'Maro: Keep the cash. You will earn it soon enough.' },
      { kind: 'talk', target: spot(6, 5, 40, 0), radius: 64, text: 'Pick up the envelope.', line: 'Maro: Mira Vela wants to meet. Bring wheels.' },
    ],
  },
  {
    id: 'vega',
    title: 'Borrowed Vega',
    client: CHARACTERS.mira,
    brief: [
      'Mira: AVega Coupe is sitting near the Palmside arcade.',
      'Mira: Bring it to Tess at the Ironworks garage. Scratches are acceptable.',
    ],
    reward: 750,
    respect: 8,
    steps: [
      { kind: 'steal', carType: 'sport', target: spot(10, 3, 0, 20), radius: 70, text: 'Find the Vega Coupe in Palmside.' },
      { kind: 'deliver', target: spot(2, 8, 0, -20), radius: 74, text: 'Deliver the Vega Coupe to Tess.' },
    ],
  },
  {
    id: 'redline',
    title: 'Redline Message',
    client: CHARACTERS.mira,
    brief: [
      'Mira: A courier named Rook is spreading around my ledger.',
      'Mira: Take his car off the road. I do not need the paperwork.',
    ],
    reward: 950,
    respect: 10,
    steps: [
      { kind: 'ram', target: spot(8, 2, 0, 30), radius: 80, text: 'Find Rook and ram his courier car.' },
    ],
  },
  {
    id: 'standoff',
    title: 'Ironworks Standoff',
    client: CHARACTERS.tess,
    brief: [
      'Tess: Four buyers are waiting in the old Ironworks yard.',
      'Tess: They brought rifles. I brought you.',
    ],
    reward: 1200,
    respect: 14,
    steps: [
      { kind: 'goto', target: spot(5, 8, 40, 20), radius: 70, text: 'Enter the Ironworks yard.' },
      { kind: 'shootout', target: spot(5, 8, 40, 20), radius: 70, enemies: 4, text: 'Clear out the buyers.' },
    ],
  },
  {
    id: 'twelve-minute',
    title: 'Twelve-Minute Favor',
    client: CHARACTERS.maro,
    brief: [
      'Maro: Clinic supplies, two stops, one very impatient driver.',
      'Maro: Beat the clock and nobody asks where the van came from.',
    ],
    reward: 1350,
    respect: 16,
    steps: [
      { kind: 'timed', start: spot(9, 5, 0, 20), time: 92, targets: [spot(9, 6, 0, 20), spot(3, 4, 0, -20)], radius: 72, text: 'Collect the clinic case, then reach the Old Town drop.' },
    ],
  },
  {
    id: 'concord',
    title: 'Concord Escort',
    client: CHARACTERS.mira,
    brief: [
      'Mira: Maro is carrying a witness. Keep him on the road.',
      'Mira: Stay close. If he gets hurt, the whole deal evaporates.',
    ],
    reward: 1600,
    respect: 20,
    steps: [
      { kind: 'escort', target: spot(12, 1, 0, 30), start: spot(11, 4, 0, 20), radius: 86, text: 'Escort Maro to the Cedar Heights safehouse.' },
    ],
  },
  {
    id: 'alarm',
    title: 'Five-Alarm Exit',
    client: CHARACTERS.harlan,
    brief: [
      'Cross: I can bury one arbitrary charge. Only one.',
      'Cross: Get the whole city looking for you, then vanish.',
    ],
    reward: 2100,
    respect: 26,
    steps: [
      { kind: 'heat', start: spot(6, 3, 0, 20), stars: 4, survive: 28, text: 'Draw four stars, then stay free for 28 seconds.' },
    ],
  },
  {
    id: 'ledger',
    title: 'Sunset Ledger',
    client: CHARACTERS.mira,
    brief: [
      'Mira: The ledger changes hands at sunset, down by the water.',
      'Mira: Get it, keep it, and drive it out of Solara Bay.',
    ],
    reward: 4000,
    respect: 50,
    steps: [
      { kind: 'goto', target: spot(7, 9, 0, -10), radius: 66, text: 'Reach the waterfront exchange.' },
      { kind: 'shootout', target: spot(7, 9, 0, -10), radius: 66, enemies: 6, text: 'Take the ledger by force.' },
      { kind: 'timed', time: 85, targets: [spot(1, 6, 0, 20)], radius: 70, text: 'Carry the ledger to the Marina exit.' },
    ],
  },
];

export const SIDE_ACTIVITIES = [
  { id: 'taxi', title: 'Taxi Fare', marker: spot(9, 4, 0, -10), reward: 280, text: 'Pick up a fare and drive them across town.' },
  { id: 'rampage', title: 'Rampage', marker: spot(11, 7, 0, 0), reward: 600, text: 'Hit the mark before the timer runs out.' },
  { id: 'delivery', title: 'Courier Checkpoints', marker: spot(4, 6, 0, 0), reward: 450, text: 'Three checkpoints, ninety seconds.' },
];

export function missionAt(index) {
  return MISSIONS[index] || null;
}

export function totalMissions() {
  return MISSIONS.length;
}

export function sideActivity(id) {
  return SIDE_ACTIVITIES.find((activity) => activity.id === id) || null;
}
