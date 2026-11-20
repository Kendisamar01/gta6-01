export const CAST = {
  marisol: 'Marisol Vega',
  oz: 'Oz Renard',
  corva: 'Detective Corva',
  tavi: 'Tavi Sun',
  lena: 'Lena Quill',
  rocco: 'Rocco Pike',
};

export const RADIO = [
  'Lena Quill here: golden hour over Solara Bay, keep the windows down.',
  'Tavi Sun says: if the engine sings, let it sing.',
  'Traffic is a suggestion on the Marina Loop, according to three witnesses.',
  'Oz Renard reminds everyone: every favour has a receipt.',
];

export const STORY = [
  {
    title: 'First Favor',
    client: CAST.marisol,
    lines: ['Marisol: You made it. Sun still over the bay, still our city.', 'Marisol: Walk to the courtyard marker and I will explain the job.'],
    stages: ['goto', 'talk'],
    reward: 450, respect: 1, timeout: 0, carType: null,
  },
  {
    title: 'Borrowed Wheels',
    client: CAST.tavi,
    lines: ['Tavi: I need a Vesper GT, the red one, no questions.', 'Tavi: Bring it to my garage before the owner notices.'],
    stages: ['goto', 'steal', 'deliver'],
    reward: 900, respect: 2, timeout: 0, carType: 'sport',
  },
  {
    title: 'Harbor Handoff',
    client: CAST.oz,
    lines: ['Oz: A cargo loaf is waiting by the docks.', 'Oz: Drive it to the Palmside drop before the clock runs dry.'],
    stages: ['goto', 'steal', 'timed'],
    reward: 1300, respect: 3, timeout: 95, carType: 'van',
  },
  {
    title: 'Red Light Run',
    client: CAST.marisol,
    lines: ['Marisol: Rocco Pike is taking a joyride with my ledger.', 'Marisol: Catch him and ram his car until it stops.'],
    stages: ['goto', 'chase'],
    reward: 1700, respect: 4, timeout: 120, carType: null,
  },
  {
    title: 'Block Party',
    client: CAST.oz,
    lines: ['Oz: Some visitors want the Old Town block to themselves.', 'Oz: Convince them otherwise. Stay standing.'],
    stages: ['goto', 'survive'],
    reward: 2200, respect: 5, timeout: 75, carType: null,
  },
  {
    title: 'Coyote Run',
    client: CAST.tavi,
    lines: ['Tavi: My cousin needs an escort across town.', 'Tavi: Keep the convoy alive and reach the marina gate.'],
    stages: ['goto', 'escort'],
    reward: 2600, respect: 6, timeout: 130, carType: null,
  },
  {
    title: 'Heat Wave',
    client: CAST.corva,
    lines: ['Detective Corva: You have four stars on your head.', 'Detective Corva: Lose them. I will pretend I saw nothing.'],
    stages: ['heat', 'escape'],
    reward: 3200, respect: 8, timeout: 150, carType: null,
  },
  {
    title: 'The Long Sunset',
    client: CAST.marisol,
    lines: ['Marisol: Last job. The courier leaves at sundown.', 'Marisol: Take the package, hold the square, and bring it home.'],
    stages: ['goto', 'survive', 'deliver'],
    reward: 6000, respect: 12, timeout: 180, carType: null,
  },
];

export const SIDES = [
  { id: 'taxi', name: 'Sunline Fare', text: 'Pick up the fare and drop it at the glowing marker.', reward: 260 },
  { id: 'rampage', name: 'Rampage', text: 'Clear the marked block before the timer ends.', reward: 380 },
  { id: 'courier', name: 'Courier Dash', text: 'Touch all three checkpoint markers in order.', reward: 420 },
];
