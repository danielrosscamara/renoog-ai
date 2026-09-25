// The "make your own" card at the end of the Gallery. Same shape as a
// CharacterCard in either layout, so it sits naturally in the grid or the list.
import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { paths } from '@/lib/paths'
import type { CharacterCardLayout } from './CharacterCard'
import styles from './CreateCharacterCard.module.css'

export function CreateCharacterCard({ layout = 'grid' }: { layout?: CharacterCardLayout }) {
  return (
    <Link to={paths.newCharacter} className={cn(styles.card, layout === 'list' ? styles.row : styles.tile)}>
      <span className={styles.icon} aria-hidden="true">
        <Plus size={24} />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>Create a companion</span>
        <span className={styles.body}>Write a character card or import one.</span>
      </span>
    </Link>
  )
}
