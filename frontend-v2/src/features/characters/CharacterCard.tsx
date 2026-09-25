// A character in the Gallery or the Home featured row. Grid: 3:4 portrait with
// the name on a scrim. List: a compact row. The whole card links to the
// character; the bookmark button sits above that link (never inside it).
// Card text is untrusted, so it is only ever rendered as plain text.
import { Link } from 'react-router'
import { Bookmark } from 'lucide-react'
import { IconButton } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Avatar, Portrait } from '@/components/Portrait'
import { cn } from '@/lib/cn'
import { paths } from '@/lib/paths'
import { GENRE_LABELS, type Character } from '@/lib/types'
import { useBookmarkMutation } from './queries'
import styles from './CharacterCard.module.css'

export type CharacterCardLayout = 'grid' | 'list'

type CharacterCardProps = {
  character: Character
  layout?: CharacterCardLayout
}

export function CharacterCard({ character, layout = 'grid' }: CharacterCardProps) {
  const bookmark = useBookmarkMutation()
  const pendingValue = bookmark.isPending ? bookmark.variables.bookmarked : undefined
  const bookmarked = pendingValue ?? character.bookmarked

  const bookmarkButton = (
    <IconButton
      label={`Bookmark ${character.name}`}
      aria-pressed={bookmarked}
      size="sm"
      variant={layout === 'grid' ? 'secondary' : 'ghost'}
      className={cn(styles.bookmark, bookmarked && styles.bookmarked)}
      onClick={() => {
        if (!bookmark.isPending) bookmark.mutate({ id: character.id, bookmarked: !bookmarked })
      }}
    >
      <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
    </IconButton>
  )

  const link = (
    <Link to={paths.character(character.id)} className={styles.link}>
      {character.name}
    </Link>
  )

  if (layout === 'list') {
    return (
      <article className={cn(styles.card, styles.row)}>
        <Avatar name={character.name} src={character.avatarUrl} size={56} />
        <div className={styles.rowText}>
          <h3 className={styles.rowName}>{link}</h3>
          <p className={styles.rowTitle}>{character.title}</p>
          <p className={styles.rowQuote}>{character.quote}</p>
        </div>
        <Chip className={styles.rowGenre}>{GENRE_LABELS[character.genre]}</Chip>
        {bookmarkButton}
      </article>
    )
  }

  return (
    <article className={cn(styles.card, styles.tile)}>
      <div className={styles.art}>
        <Portrait name={character.name} src={character.avatarUrl} fallback="overlay" />
        <div className={styles.scrim}>
          <Chip variant="image">{GENRE_LABELS[character.genre]}</Chip>
          <h3 className={styles.name}>{link}</h3>
          <p className={styles.title}>{character.title}</p>
        </div>
      </div>
      <p className={styles.quote}>{character.quote}</p>
      {bookmarkButton}
    </article>
  )
}
