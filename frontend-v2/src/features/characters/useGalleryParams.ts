// Gallery filters live in the URL (?q=&genre=&sort=&view=) so a filtered
// gallery can be shared, bookmarked and restored with Back. Unknown values fall
// back to the defaults, and defaults are left out of the URL to keep it short.
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { GENRES, type CharacterSort, type Genre } from '@/lib/types'

/** grid: 3:4 portrait cards. list: compact rows. */
export type GalleryView = 'grid' | 'list'

export const SORTS: readonly CharacterSort[] = ['recent', 'newest', 'name']
export const VIEWS: readonly GalleryView[] = ['grid', 'list']

export const DEFAULT_SORT: CharacterSort = 'recent'
export const DEFAULT_VIEW: GalleryView = 'grid'

export type GalleryParams = {
  q: string
  genre: Genre | undefined
  sort: CharacterSort
  view: GalleryView
}

const pick = <T extends string>(allowed: readonly T[], value: string | null): T | undefined =>
  allowed.find((item) => item === value)

export function useGalleryParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo<GalleryParams>(
    () => ({
      q: searchParams.get('q') ?? '',
      genre: pick(GENRES, searchParams.get('genre')),
      sort: pick(SORTS, searchParams.get('sort')) ?? DEFAULT_SORT,
      view: pick(VIEWS, searchParams.get('view')) ?? DEFAULT_VIEW,
    }),
    [searchParams],
  )

  /**
   * Merges `changes` into the URL. Typing in search replaces the history entry
   * (so Back doesn't step through every keystroke); other changes push one.
   */
  const update = useCallback(
    (changes: Partial<GalleryParams>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          const set = (key: string, value: string | undefined, fallback?: string) => {
            if (!value || value === fallback) next.delete(key)
            else next.set(key, value)
          }
          if ('q' in changes) set('q', changes.q?.trim())
          if ('genre' in changes) set('genre', changes.genre)
          if ('sort' in changes) set('sort', changes.sort, DEFAULT_SORT)
          if ('view' in changes) set('view', changes.view, DEFAULT_VIEW)
          return next
        },
        { replace: Object.keys(changes).every((key) => key === 'q') },
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(() => update({ q: '', genre: undefined }), [update])

  return { params, update, clearFilters }
}
