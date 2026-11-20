export const CHARACTERS = {
  marco: { name: 'MARCO REYES', color: '#f3c76b', role: 'your cousin' },
  sombra: { name: 'SOMBRA', color: '#c2a5f0', role: 'the fixer' },
  vale: { name: 'DET. INES VALE', color: '#8fc9e8', role: 'badge for sale' },
  rina: { name: 'RINA SOL', color: '#8ed9a1', role: 'garage owner' },
  kiko: { name: 'KIKO SUN', color: '#f3a16f', role: 'Radio Solara' },
};

export const INTRO_DIALOGUE = [
  { speaker: 'kiko', text: 'Good evening, Solara. Palm shadows, warm asphalt, and a radio show that never signs off.' },
  { speaker: 'marco', text: 'You made it. Sombra has work, and work pays better than waiting tables.' },
  { speaker: 'sombra', text: 'Keep your head down, take the wheel, and this bay will open up for you.' },
];

export const MISSION_DIALOGUE = [
  [
    { speaker: 'marco', text: 'First rule of the bay: family eats first. Meet me at Cafe Coral.' },
    { speaker: 'marco', text: 'Bring an appetite. I know a garage that needs a fresh pair of hands.' },
  ],
  [
    { speaker: 'sombra', text: 'A blue Vesper GT is parked on Coral Boulevard. Its owner will be fine with the loan.' },
    { speaker: 'rina', text: 'Bring it to my garage in one piece and I will forget how the keys got here.' },
  ],
  [
    { speaker: 'marco', text: 'A blue Tidewater Van is rolling toward the marina with someone else’s cargo.' },
    { speaker: 'sombra', text: 'Ram it until it stops. I want the van, not a story about a chase.' },
  ],
  [
    { speaker: 'vale', text: 'Old Town, nine tonight. Some people want you gone. I want them gone first.' },
    { speaker: 'sombra', text: 'Survive the crossfire and the street is ours by morning.' },
  ],
  [
    { speaker: 'rina', text: 'Depot to harbor, five drops. Clock is running, hot shoes.' },
    { speaker: 'kiko', text: 'And they say the traffic lights around here are generous. They are not.' },
  ],
  [
    { speaker: 'sombra', text: 'My armored van rolls to the Golden Horn. You shadow it, no heroics.' },
    { speaker: 'marco', text: 'Translation: if the van blows up, we all walk home.' },
  ],
  [
    { speaker: 'vale', text: 'Three stars on your head, and a nice little terrace in Palm Terrace.' },
    { speaker: 'sombra', text: 'Lose the cruisers before you reach the terrace. Lose them, not the car.' },
  ],
  [
    { speaker: 'sombra', text: 'The Golden Horn Club. Eight guards, one package, one chance.' },
    { speaker: 'marco', text: 'After this, the bay belongs to us. Or at least the parking spots do.' },
  ],
];

export const MISSION_TITLES = [
  'Sunset Handshake',
  'Borrowed Vesper',
  'Harbor Shuffle',
  'Old Town Crossfire',
  'Thirty-Minute Mirage',
  'Convoy to the Horn',
  'Heat Wave',
  'The Long Light',
];

export const RADIO_LINES = [
  'KIKO SUN: Keep it bright, keep it moving, Solara.',
  'KIKO SUN: Palm trees are the only things allowed to idle.',
  'KIKO SUN: If your engine sounds sad, rev it twice for me.',
  'KIKO SUN: The marina lights are on. So is everyone else.',
];
