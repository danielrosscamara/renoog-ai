// Route table. Every page is lazy loaded; AppShell frames them all and
// RouterError catches anything a page throws. The /dev/components preview is
// added only in dev; Vite drops the branch (and its chunk) from production builds.
import { createBrowserRouter, type RouteObject } from 'react-router'
import { paths, routePatterns } from '../lib/paths'
import { AppShell } from './layout/AppShell'
import { RouterError } from './RouterError'

type Pages = typeof import('./placeholders')

/** Lazy loads one page component. Swap the import for a feature view when it lands. */
function page(name: keyof Pages): RouteObject['lazy'] {
  return async () => {
    const pages = await import('./placeholders')
    return { Component: pages[name] }
  }
}

const pageRoutes: RouteObject[] = [
  { index: true, lazy: page('HomePage') },
  { path: paths.gallery, lazy: page('GalleryPage') },
  { path: paths.stories, lazy: page('StoriesPage') },
  { path: routePatterns.chat, lazy: page('ChatPage') },
  { path: paths.newCharacter, lazy: page('NewCharacterPage') },
  { path: routePatterns.character, lazy: page('CharacterPage') },
  { path: paths.personas, lazy: page('PersonasPage') },
  { path: paths.settings, lazy: page('SettingsPage') },
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
