// Every route path in the app. Links use `paths`, the router uses `routePatterns`.

export const paths = {
  home: '/',
  gallery: '/gallery',
  stories: '/stories',
  chat: (chatId: string) => `/chat/${encodeURIComponent(chatId)}`,
  character: (characterId: string) => `/characters/${encodeURIComponent(characterId)}`,
  newCharacter: '/characters/new',
  personas: '/personas',
  settings: '/settings',
} as const

/** Route patterns with params, for the router only. */
export const routePatterns = {
  chat: '/chat/:chatId',
  character: '/characters/:characterId',
} as const
