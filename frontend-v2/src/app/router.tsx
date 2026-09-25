// Route table. Every page is lazy loaded; AppShell frames them all and
// RouterError catches anything a page throws. /chat is a nested layout: its
// index redirects to the latest chat and :chatId shows one chat. The
// /dev/components preview is added only in dev; Vite drops the branch (and its
// chunk) from production builds.
import { createBrowserRouter, type RouteObject } from 'react-router'
import { paths, routePatterns } from '../lib/paths'
import { AppShell } from './layout/AppShell'
import { RouterError } from './RouteError'

type Pages = typeof import('./placeholders')
type ChatPage = 'ChatLayout' | 'ChatIndex' | 'ChatView' | 'ChatListView'

/** Lazy loads one placeholder page. Swap it for a feature view when that view lands. */
function page(name: keyof Pages): RouteObject['lazy'] {
  return async () => {
    const pages = await import('./placeholders')
    return { Component: pages[name] }
  }
}

/** Lazy loads one component from the chat feature. */
function chatPage(name: ChatPage): RouteObject['lazy'] {
  return async () => {
    const pages = await import('../features/chat')
    return { Component: pages[name] }
  }
}

const pageRoutes: RouteObject[] = [
  { index: true, lazy: async () => ({ Component: (await import('../features/home')).HomeView }) },
  { path: paths.gallery, lazy: async () => ({ Component: (await import('../features/characters')).GalleryView }) },
  { path: paths.stories, lazy: chatPage('ChatListView') },
  {
    path: paths.chatHome,
    lazy: chatPage('ChatLayout'),
    children: [
      { index: true, lazy: chatPage('ChatIndex') },
      { path: routePatterns.chat, lazy: chatPage('ChatView') },
    ],
  },
  { path: paths.newCharacter, lazy: page('NewCharacterPage') },
  { path: routePatterns.character, lazy: page('CharacterPage') },
  { path: '*', lazy: page('NotFoundPage') },
]

if (import.meta.env.DEV) {
  // Path lives here, not in paths.ts, so the string never ships in production.
  pageRoutes.push({
    path: '/dev/components',
    lazy: async () => ({ Component: (await import('../dev/ComponentsPreview')).ComponentsPreview }),
  })
}

export const routes: RouteObject[] = [
  {
    Component: AppShell,
    ErrorBoundary: RouterError,
    HydrateFallback: () => null,
    children: [
      {
        ErrorBoundary: RouterError,
        children: pageRoutes,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
