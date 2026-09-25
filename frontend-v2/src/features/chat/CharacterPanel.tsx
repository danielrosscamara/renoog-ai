// Right column of the chat room: who you're talking to. Portrait, name,
// tagline, tags and style preset. Its toggle mirrors the StoryRail's.
import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { IconButton } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Portrait } from '@/components/Portrait'
import { Skeleton } from '@/components/Skeleton'
import { characterQuery } from '@/features/characters'
import { cn } from '@/lib/cn'
import styles from './CharacterPanel.module.css'

type CharacterPanelProps = {
  /** Empty when no chat is open. */
  characterId: string
  collapsed: boolean
  onToggle: () => void
}

export function CharacterPanel({ characterId, collapsed, onToggle }: CharacterPanelProps) {
  const character = useQuery(characterQuery(characterId))
  const bodyId = useId()

  return (
    <aside aria-label="Character" className={cn(styles.panel, collapsed && styles.collapsed)}>
      <div className={styles.head}>
        <IconButton
          label={collapsed ? 'Expand character panel' : 'Collapse character panel'}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          size="sm"
          onClick={onToggle}
        >
          {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
        </IconButton>
      </div>

      <div id={bodyId} hidden={collapsed} className={styles.body}>
        {!characterId ? (
          <p className={styles.note}>Open a story to meet its character.</p>
        ) : character.isPending ? (
          <>
            <Skeleton className={styles.portrait} />
            <Skeleton height={24} width="60%" />
            <Skeleton height={16} width="80%" />
          </>
        ) : character.isError ? (
          <p role="alert" className={styles.note}>Couldn’t load this character.</p>
        ) : (
          <>
            <div className={styles.portrait}>
              <Portrait name={character.data.name} src={character.data.avatarUrl} />
            </div>
            <div>
              <h2 className={styles.name}>{character.data.name}</h2>
              <p className={styles.tagline}>{character.data.title}</p>
            </div>
            {character.data.tags.length > 0 && (
              <ul aria-label="Tags" className={styles.tags}>
                {character.data.tags.map((tag) => (
                  <li key={tag}>
                    <Chip>{tag}</Chip>
                  </li>
                ))}
              </ul>
            )}
            <dl className={styles.meta}>
              <dt>Style preset</dt>
              <dd>{character.data.style}</dd>
            </dl>
          </>
        )}
      </div>
    </aside>
  )
}
