import type { Character, ChatSummary } from '@/lib/types'

export function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'sylvan',
    name: 'Sylvan',
    title: 'Herbalist of Oakhaven',
    quote: 'Patience brews a sweeter draught than haste.',
    description: 'Tends a shop of hanging herbs.',
    genre: 'fireside-fantasy',
    style: 'Slow burn',
    tags: ['Cozy Fantasy'],
    avatarUrl: null,
    bookmarked: false,
    createdAt: '2026-09-01T00:00:00Z',
    lastChattedAt: null,
    ...overrides,
  }
}

export function makeChat(overrides: Partial<ChatSummary> = {}): ChatSummary {
  return {
    id: 'chat-rowan',
    character: { id: 'rowan', name: 'Rowan of the Hearth', avatarUrl: null, role: 'companion' },
    sceneLabel: 'Campfire Scene',
    lastLine: 'The kettle is whistling.',
    chapter: 4,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
