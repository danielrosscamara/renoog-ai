import type { CharacterQuery } from './types'

/** Every TanStack Query key in one place so invalidation can't drift. */
export const queryKeys = {
  persona: {
    all: ['persona'] as const,
    list: ['persona', 'list'] as const,
    active: ['persona', 'active'] as const,
  },
  settings: ['settings'] as const,
  presets: ['presets'] as const,
  models: ['models'] as const,
  chats: {
    all: ['chats'] as const,
    list: (limit?: number) => ['chats', 'list', { limit }] as const,
    detail: (id: string) => ['chats', 'detail', id] as const,
  },
  characters: {
    all: ['characters'] as const,
    list: (q: CharacterQuery) => ['characters', 'list', q] as const,
    featured: ['characters', 'featured'] as const,
    detail: (id: string) => ['characters', 'detail', id] as const,
  },
}
