import type { Character, Chat, MessageTurn, Persona } from '../types';

/**
 * DEV-ONLY sample data so the design harness renders without a backend.
 * Placeholder "art" is deliberately saturated and varied in temperature:
 * the chrome has to hold up next to warm, cool, light and dark cards alike.
 */

const art = (bg: string, fg: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="${bg}"/><circle cx="150" cy="150" r="70" fill="${fg}"/><path d="M40 400 C60 270 240 270 260 400Z" fill="${fg}"/><circle cx="235" cy="70" r="28" fill="${accent}"/></svg>`
  )}`;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

export const fixtureCharacters: Character[] = [
  {
    id: 'char_mira',
    name: 'Mira Ashford',
    tagline: 'Night-shift archivist who reads the letters nobody came back for.',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    avatar_url: art('#F2B8A2', '#7A3B2E', '#FFE3B3'),
    tags: ['slice of life', 'mystery', 'slow burn', 'library'],
    is_favorite: true,
    creator: 'lanternmoth',
    created_at: minutesAgo(9000),
  },
  {
    id: 'char_kaito',
    name: 'Kaito Renjou',
    tagline: 'Exiled court strategist. Polite, precise, and three moves ahead of you.',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    avatar_url: art('#1E2A44', '#4E6FA8', '#C9D6F0'),
    tags: ['dark fantasy', 'political'],
    is_favorite: false,
    creator: 'sableink',
    created_at: minutesAgo(20000),
  },
  {
    id: 'char_suzu',
    name: 'Suzu',
    tagline: 'Your overly earnest shrine-keeper roommate.',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    avatar_url: art('#CFE8C9', '#E86A92', '#FFF6A8'),
    tags: ['comedy', 'shoujo', 'wholesome', 'roommates', 'modern'],
    is_favorite: false,
    creator: 'petalpress',
    created_at: minutesAgo(40000),
  },
  {
    id: 'char_vale',
    name: 'The Warden of Vale',
    tagline: '',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    avatar_url: '',
    tags: ['horror'],
    is_favorite: false,
    creator: 'anon',
    created_at: minutesAgo(60000),
  },
];

export const fixturePersonas: Persona[] = [
  { id: 'persona_rin', name: 'Rin', description: '', avatar_url: art('#3B3350', '#B7A6E8', '#EDE7FF'), is_default: true },
  { id: 'persona_courier', name: 'The Courier', description: '', avatar_url: '', is_default: false },
];

export const fixtureChats: Chat[] = [
  {
    id: 'chat_1',
    character_id: 'char_mira',
    persona_id: 'persona_rin',
    title: 'The letter dated forty years from now',
    model_name: 'deepseek/deepseek-chat',
    temperature: 0.9,
    is_pinned: true,
    updated_at: minutesAgo(12),
  },
  {
    id: 'chat_2',
    character_id: 'char_kaito',
    persona_id: 'persona_rin',
    title: 'Tea with the man who burned the eastern granaries, and what he wants from you in exchange',
    model_name: 'deepseek/deepseek-chat',
    temperature: 0.8,
    is_pinned: false,
    updated_at: minutesAgo(140),
  },
  {
    id: 'chat_3',
    character_id: 'char_suzu',
    persona_id: 'persona_rin',
    title: 'Who let the fox spirit into the kitchen',
    model_name: 'deepseek/deepseek-chat',
    temperature: 1,
    is_pinned: false,
    updated_at: minutesAgo(60 * 30),
  },
  {
    id: 'chat_4',
    character_id: 'char_vale',
    persona_id: null,
    title: 'Lights out on the ninth floor',
    model_name: 'deepseek/deepseek-chat',
    temperature: 0.7,
    is_pinned: false,
    updated_at: minutesAgo(60 * 24 * 4),
  },
];

export const fixtureTurns: Record<string, MessageTurn[]> = {
  chat_1: [
    {
      id: 't1',
      chat_id: 'chat_1',
      role: 'assistant',
      active_index: 0,
      created_at: minutesAgo(40),
      swipes: [
        `*The reading room is empty at this hour, lit only by the green-shaded lamp on Mira's desk. She doesn't look up when the door sighs shut behind you — just slides a yellowed envelope across the oak, one fingertip pinning its corner.*\n\n"You're late. Which is funny, considering." *She taps the postmark.* "Look at the date."\n\n*The ink reads the fourteenth of March. The year is forty years from now. Your name is on the front, written in a hand you recognize as your own, only older, and shaking.*`,
      ],
    },
    {
      id: 't2',
      chat_id: 'chat_1',
      role: 'user',
      active_index: 0,
      created_at: minutesAgo(31),
      persona_id: 'persona_rin',
      swipes: [
        `*I don't touch it.* "Where did this come from? And don't tell me the mail cart."`,
      ],
    },
    {
      id: 't3',
      chat_id: 'chat_1',
      role: 'assistant',
      active_index: 1,
      created_at: minutesAgo(12),
      is_pinned: true,
      swipes: [
        `"The mail cart," *she says, deadpan, and finally meets your eyes.*`,
        `*Mira leans back until her chair creaks, studying you over the rim of her glasses as though you were a document with a suspicious provenance.*\n\n"The dead-letter vault. Shelf nine, the one that isn't on the floor plan." *A pause.* "It was filed under **unclaimed**, which means that in forty years, you don't come back for it either."\n\n*She pushes the envelope another inch toward you. The lamp hums. Somewhere in the stacks, a book settles on its shelf with a sound like a held breath let go.*`,
        `*She shrugs.* "It was here when I opened. Sitting on my chair, like a cat."`,
      ],
    },
  ],
};
