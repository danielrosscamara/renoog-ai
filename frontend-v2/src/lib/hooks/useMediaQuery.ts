// True while a CSS media query matches, updating live (resize, OS setting).
import { useCallback, useMemo, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const list = useMemo(() => window.matchMedia(query), [query])
  const subscribe = useCallback(
    (onChange: () => void) => {
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [list],
  )
  return useSyncExternalStore(subscribe, () => list.matches, () => false)
}
