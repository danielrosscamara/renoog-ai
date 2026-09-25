// /gallery: every character, with search, genre chips, sort and a grid/list
// switch. All filters are URL state (useGalleryParams). Search waits for a
// pause in typing before it updates the URL, so each keystroke isn't a request.
import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, List, Search, SearchX, Sparkles, Users } from 'lucide-react'
import { Button, ButtonLink, IconButton } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'
import { paths } from '@/lib/paths'
import { GENRE_LABELS, GENRES, type CharacterSort, type Genre } from '@/lib/types'
import { CharacterCard } from './CharacterCard'
import { CreateCharacterCard } from './CreateCharacterCard'
import { charactersQuery } from './queries'
import { SORTS, useGalleryParams } from './useGalleryParams'
import styles from './GalleryView.module.css'

export const SEARCH_DELAY_MS = 300

const SORT_LABELS: Record<CharacterSort, string> = {
  recent: 'Recently chatted',
  newest: 'Newest',
  name: 'Name (A to Z)',
}

export function GalleryView() {
  useDocumentTitle('Gallery')
  const { params, update, clearFilters } = useGalleryParams()
  const sortId = useId()

  // The search box holds a draft; the URL gets it after a pause in typing.
  const [draft, setDraft] = useState(params.q)
  const [syncedQ, setSyncedQ] = useState(params.q)
  if (params.q !== syncedQ) {
    // The URL changed on its own (Back, Clear filters): show that in the box.
    setSyncedQ(params.q)
    if (params.q !== draft.trim()) setDraft(params.q)
  }

  useEffect(() => {
    if (draft.trim() === params.q) return
    const timer = setTimeout(() => update({ q: draft }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, params.q, update])

  const characters = useQuery(charactersQuery({ q: params.q || undefined, genre: params.genre, sort: params.sort }))
  const filtered = params.q !== '' || params.genre !== undefined
  const counts = characters.data?.genreCounts
  const allCount = counts && Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)

  const genreChip = (genre: Genre | undefined, label: string, count: number | undefined) => (
    <button
      key={genre ?? 'all'}
      type="button"
      aria-pressed={params.genre === genre}
      className={styles.genre}
      onClick={() => update({ genre })}
    >
      {label}
      {count !== undefined && (
        <>
          {' '}
          <span className={styles.count}>{count}</span>
        </>
      )}
    </button>
  )

  return (
    <div className={cn('container', styles.page)}>
      <PageHeader title="Gallery" lead="Find someone to share a story with." />

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search aria-hidden="true" size={18} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by name, title or tag"
            aria-label="Search characters"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>

        <div className={styles.sort}>
          <label htmlFor={sortId} className={styles.sortLabel}>Sort</label>
          <select
            id={sortId}
            className={styles.select}
            value={params.sort}
            onChange={(event) => update({ sort: event.target.value as CharacterSort })}
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>{SORT_LABELS[sort]}</option>
            ))}
          </select>
        </div>

        <div role="group" aria-label="Layout" className={styles.views}>
          <IconButton label="Grid view" aria-pressed={params.view === 'grid'} onClick={() => update({ view: 'grid' })}>
            <LayoutGrid size={18} />
          </IconButton>
          <IconButton label="List view" aria-pressed={params.view === 'list'} onClick={() => update({ view: 'list' })}>
            <List size={18} />
          </IconButton>
        </div>
      </div>

      <div role="group" aria-label="Genre" className={styles.genres}>
        {genreChip(undefined, 'All', allCount)}
        {GENRES.map((genre) => genreChip(genre, GENRE_LABELS[genre], counts ? (counts[genre] ?? 0) : undefined))}
      </div>

      <p className={styles.status} aria-live="polite">
        {characters.data &&
          `${characters.data.items.length} ${characters.data.items.length === 1 ? 'character' : 'characters'}`}
      </p>

      {characters.isPending ? (
        <ul className={cn(styles.results, styles[params.view])} aria-label="Loading characters">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              {params.view === 'grid' ? <Skeleton className={styles.tileSkeleton} /> : <Skeleton height={82} />}
            </li>
          ))}
        </ul>
      ) : characters.isError ? (
        <StateMessage
          role="alert"
          title="Couldn’t load the Gallery"
          body="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => void characters.refetch()}>Try again</Button>}
        />
      ) : characters.data.items.length === 0 ? (
        filtered ? (
          <StateMessage
            icon={SearchX}
            title="No characters match"
            body="Try another search or genre."
            action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <StateMessage
            icon={Users}
            title="No characters yet"
            body="Make the first companion for your stories."
            action={
              <ButtonLink to={paths.newCharacter} leadingIcon={<Sparkles size={18} />}>
                Create companion
              </ButtonLink>
            }
          />
        )
      ) : (
        <ul
          className={cn(styles.results, styles[params.view], characters.isPlaceholderData && styles.stale)}
          aria-busy={characters.isPlaceholderData}
        >
          {characters.data.items.map((character) => (
            <li key={character.id}>
              <CharacterCard character={character} layout={params.view} />
            </li>
          ))}
          <li>
            <CreateCharacterCard layout={params.view} />
          </li>
        </ul>
      )}
    </div>
  )
}
