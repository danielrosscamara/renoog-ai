// jsdom has no matchMedia. This fake is installed once in setup.ts (before any
// app module reads it) and lets a test flip a media query and fire 'change',
// e.g. setMediaQuery('(prefers-color-scheme: light)', true) to mimic the OS.

type Listener = (event: MediaQueryListEvent) => void

const matches = new Map<string, boolean>()
const lists = new Map<string, Set<Listener>>()

function listenersFor(query: string): Set<Listener> {
  let set = lists.get(query)
  if (!set) lists.set(query, (set = new Set()))
  return set
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return matches.get(query) ?? false
      },
      onchange: null,
      addEventListener: (_type: 'change', listener: Listener) => listenersFor(query).add(listener),
      removeEventListener: (_type: 'change', listener: Listener) => listenersFor(query).delete(listener),
      addListener: (listener: Listener) => listenersFor(query).add(listener),
      removeListener: (listener: Listener) => listenersFor(query).delete(listener),
      dispatchEvent: () => true,
    }) as MediaQueryList

}

/** Sets whether `query` matches and notifies its listeners, like the OS or a resize would. */
export function setMediaQuery(query: string, value: boolean) {
  matches.set(query, value)
  const event = { matches: value, media: query } as MediaQueryListEvent
  listenersFor(query).forEach((listener) => listener(event))
}

/** Back to "nothing matches". Called after each test. */
export function resetMediaQueries() {
  for (const query of [...matches.keys()]) setMediaQuery(query, false)
}
