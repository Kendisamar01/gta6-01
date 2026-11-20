import { CITY } from './config.js';

const point = (column, row) => ({ x: column * CITY.cell + CITY.cell / 2, y: row * CITY.cell + CITY.cell / 2 });

export const CHARACTERS = {
  marco: { name: 'Marco Rey', role: 'Your cousin', color: '#e8b96d' },
  sombra: { name: 'La Sombra', role: 'Fixer and credit collector', color: '#b79ad6' },
  vale: { name: 'Detective Vale', role: 'Corrupt detective', color: '#6f95c4' },
  nia: { name: 'Nia Sol', role: 'Dock dispatcher', color: '#6fc4a8' },
};

export const MISSIONS = [
  {
    id: 'arrival',
    title: 'Sunboard Welcome',
    giver: 'marco',
    type: 'goto',
    target: point(6, 18),
    objective: 'Meet Marco at the Palmside lookout',
    brief: ['Marco: You made it. Solara Bay smells like salt and bad decisions.', 'Marco: Walk to the lookout. I left something with your name on it.'],
    success: ['Marco: That is the pistol. Try not to shoot yourself with it.'],
    fail: ['Marco: I am not paying for a taxi ride to the morgue.'],
    reward: { money: 350, respect: 5, weapon: 'pistol' },
  },
  {
    id: 'borrow',
    title: 'Borrowed Engine',
    giver: 'marco',
    type: 'steal',
    vehicle: 'sports',
    target: point(20, 9),
    objective: 'Bring Marco a sports car from Downtown',
    brief: ['Marco: Blue Wave Detail has a patient owner and a red sports car.', 'Marco: Liberate it. Nobody gets hurt, ideally.'],
    success: ['Marco: Beautiful. A little loud, but beautiful.'],
    fail: ['Marco: The tow truck beat you to it.'],
    reward: { money: 700, respect: 8 },
  },
  {
    id: 'detail',
    title: 'Fresh Coat',
    giver: 'sombra',
    type: 'deliver',
    vehicle: 'sports',
    target: point(24, 19),
    objective: 'Deliver the car to Blue Wave Detail in Marina',
    brief: ['La Sombra: A clean car is a clean alibi.', 'La Sombra: Drive it to the detail shop before the engine cools.'],
    success: ['La Sombra: Spotless. I knew you had it in you.'],
    fail: ['La Sombra: You brought me scrap. Try again.'],
    reward: { money: 900, respect: 10, heat: 0 },
  },
  {
    id: 'courier',
    title: 'The Courier',
    giver: 'nia',
    type: 'chase',
    target: point(13, 21),
    objective: 'Ram the courier before he reaches the marina',
    brief: ['Nia: He is driving a yellow taxi with a very nervous horn.', 'Nia: Catch him and make him stop. Gently is optional.'],
    success: ['Nia: Package recovered. You are a menace, but you are our menace.'],
    fail: ['Nia: He vanished into the marina traffic.'],
    reward: { money: 1100, respect: 12 },
  },
  {
    id: 'precinct',
    title: 'Precinct Party',
    giver: 'sombra',
    type: 'survive',
    target: point(5, 20),
    objective: 'Survive the ambush outside Palmside Precinct',
    brief: ['La Sombra: Detective Vale invited four friends. They did not invite you.', 'La Sombra: Stay on your feet for forty seconds.'],
    success: ['La Sombra: Vale is going to hate that.'],
    fail: ['La Sombra: I told you to duck.'],
    reward: { money: 1400, respect: 16 },
  },
  {
    id: 'package',
    title: 'Hot Package',
    giver: 'nia',
    type: 'timed',
    target: point(14, 7),
    time: 75,
    objective: 'Reach the Old Town drop in under 75 seconds',
    brief: ['Nia: Clock is running. The buyer has a very short attention span.', 'Nia: Get to the Old Town clock tower before the timer dies.'],
    success: ['Nia: Right on time. The buyer says hello.'],
    fail: ['Nia: The buyer left. You were beautiful but slow.'],
    reward: { money: 1600, respect: 18 },
  },
  {
    id: 'escort',
    title: 'Walking Shadow',
    giver: 'sombra',
    type: 'escort',
    target: point(18, 13),
    objective: 'Escort La Sombra to Bay General Hospital',
    brief: ['La Sombra: My ride was compromised. Walk with me.', 'La Sombra: Keep me breathing and keep the street clear.'],
    success: ['La Sombra: You have a future in this city. A short one, but a future.'],
    fail: ['La Sombra: Next time, drive.'],
    reward: { money: 1900, respect: 22 },
  },
  {
    id: 'heat',
    title: 'Lose the Heat',
    giver: 'vale',
    type: 'escape',
    objective: 'Reach four stars, then lose the police',
    brief: ['Detective Vale: Make some noise. I need an excuse to clear the precinct.', 'Detective Vale: Hit four stars and disappear. Do not get caught.'],
    success: ['Detective Vale: Wonderful. Half the station is looking at a destroyed bicycle.'],
    fail: ['Detective Vale: You were arrested. I was never here.'],
    reward: { money: 2300, respect: 26 },
  },
  {
    id: 'finale',
    title: 'Sunset Account',
    giver: 'sombra',
    type: 'finale',
    target: point(16, 8),
    objective: 'Settle the account at Civic Hall',
    brief: ['La Sombra: Vale made a copy of the ledger. It ends tonight.', 'La Sombra: Get to Civic Hall. Bring everything you have left.'],
    success: ['La Sombra: The ledger is ash. Solara Bay owes you one, kid.'],
    fail: ['La Sombra: The city keeps its secrets. We try again.'],
    reward: { money: 5000, respect: 40 },
  },
];

export const SIDE_ACTIVITIES = [
  {
    id: 'taxi',
    title: 'Semaphore Taxi',
    type: 'taxi',
    target: point(12, 12),
    dropoff: point(22, 22),
    objective: 'Taxi: pick up the fare, then drive to the marina',
    reward: { money: 480, respect: 4 },
    brief: ['Nia: Fare waiting on Tangerine. Car optional, but recommended.'],
  },
  {
    id: 'rampage',
    title: 'Window Shopping',
    type: 'rampage',
    target: point(9, 9),
    objective: 'Rampage: disable eight vehicles in 50 seconds',
    reward: { money: 850, respect: 9 },
    brief: ['Marco: Old Town has too many parked cars. Fix that.'],
  },
  {
    id: 'delivery',
    title: 'Three Stops',
    type: 'delivery',
    target: point(18, 5),
    checkpoints: [point(18, 5), point(27, 14), point(15, 22)],
    objective: 'Delivery: touch each checkpoint in order',
    reward: { money: 620, respect: 6 },
    brief: ['Nia: Three envelopes, three corners. No questions.'],
  },
];

export function missionAt(index) {
  return MISSIONS[((index % MISSIONS.length) + MISSIONS.length) % MISSIONS.length];
}

export function dialogueFor(mission, phase) {
  if (!mission) return [];
  if (phase === 'brief') return mission.brief || [];
  if (phase === 'success') return mission.success || [];
  return mission.fail || [];
}

export function characterName(key) {
  return CHARACTERS[key] ? CHARACTERS[key].name : 'Unknown';
}

export function install(context) {
  context.systems.story = { missions: MISSIONS, activities: SIDE_ACTIVITIES, characters: CHARACTERS };
}
