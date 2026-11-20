export const CHARACTERS = {
  marco: 'Marco Reyes',
  ledger: 'Imani "Ledger" Vale',
  cross: 'Detective Harlan Cross',
  nia: 'Nia Solano',
};

export const MISSIONS = [
  {
    name: 'Sunrise Courier',
    giver: 'Marco Reyes',
    brief: 'My cousin needs a runner. Walk over and say hello.',
    intro: ['Marco: Bay morning, cuz. Still walking? Good.', 'Marco: See that gold marker? Come find me and we talk business.'],
    type: 'goto',
    targetName: 'MARGO TOWER',
    reward: 350,
  },
  {
    name: 'Borrowed Wheels',
    giver: 'Marco Reyes',
    brief: 'Bring the white van from Palmside to the garage.',
    intro: ['Marco: A client left a van unattended. Unattended means ours.', 'Marco: Jack it, drive it to Miracle Detail. Try not to bend it.'],
    type: 'steal',
    carType: 'van',
    dropName: 'MIRACLE DETAIL',
    reward: 700,
  },
  {
    name: 'Red Light Run',
    giver: 'Imani "Ledger" Vale',
    brief: 'Deliver the package across Downtown before the clock runs out.',
    intro: ['Ledger: I pay for punctuality, not explanations.', 'Ledger: Ninety seconds. Cross the city, lose nothing.'],
    type: 'timed',
    targetName: 'SUN CLINIC',
    seconds: 95,
    reward: 900,
  },
  {
    name: 'Escort Detail',
    giver: 'Nia Solano',
    brief: 'Get Nia to the Marina without wrecking her ride.',
    intro: ['Nia: Cross has people watching the docks.', 'Nia: Drive me there in one piece and I will tell you what he is planning.'],
    type: 'escort',
    targetName: 'TIDAL WORKS',
    reward: 1100,
  },
  {
    name: 'Loose Ends',
    giver: 'Imani "Ledger" Vale',
    brief: 'Survive the ambush in Old Town and return fire.',
    intro: ['Ledger: Cross sent a greeting party. It is not friendly.', 'Ledger: Grab a gun from the blue marker. Take care of the rest.'],
    type: 'survive',
    enemies: 5,
    reward: 1500,
  },
  {
    name: 'Hot Property',
    giver: 'Marco Reyes',
    brief: 'Chase the witness and ram their car until it stops.',
    intro: ['Marco: That sedan is carrying the license plate we need.', 'Marco: Ram it. Hard. Then take what is inside.'],
    type: 'chase',
    reward: 1800,
  },
  {
    name: 'Heat Wave',
    giver: 'Detective Harlan Cross',
    brief: 'Lead the patrol on a wild chase, then vanish.',
    intro: ['Cross: I know it was you, kid. Prove it and I can pin it on you.', 'Cross: Get three stars, then make them lose you. Consider it audition.'],
    type: 'escape',
    reward: 2200,
  },
  {
    name: 'Tidal Job',
    giver: 'Imani "Ledger" Vale',
    brief: 'Final run: reach Tidal Works, hold the yard, and disappear.',
    intro: ['Ledger: This is the one that buys a new life.', 'Ledger: Get to the works, hold your ground, then shed the heat. No mistakes.'],
    type: 'finale',
    targetName: 'TIDAL WORKS',
    enemies: 7,
    reward: 5000,
  },
];

export function dialogueFor(index, line = 0) {
  const mission = MISSIONS[Math.min(index, MISSIONS.length - 1)];
  return mission.intro[Math.min(line, mission.intro.length - 1)];
}

export function missionByTarget(name) {
  return MISSIONS.findIndex((mission) => mission.targetName === name || mission.dropName === name);
}

const RADIO = [
  'KSOL 99.4: Sunset over Solara Bay, and the traffic is already a mess.',
  'KSOL 99.4: Reminder: jaywalking is still technically a crime. Technically.',
  'KSOL 99.4: A white van was reported missing somewhere near Palmside.',
  'KSOL 99.4: The Marina wind is blowing in from the east. Bring a jacket.',
  'KSOL 99.4: Witnesses describe a driver with absolutely no regard for paintwork.',
  'KSOL 99.4: Keep it cool out there, Bay. Or do not. We are not your supervisor.',
];

export function radioLine(random) {
  return RADIO[Math.floor(random() * RADIO.length)];
}

export const SIDE_ACTIVITIES = {
  taxi: { name: 'Taxi Fare', reward: 220, description: 'Pick up a fare and reach the drop-off.' },
  rampage: { name: 'Rampage', reward: 300, description: 'Cause damage before the timer runs out.' },
  delivery: { name: 'Bike Courier', reward: 180, description: 'Hit three checkpoints in order.' },
};
