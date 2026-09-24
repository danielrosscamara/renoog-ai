// Small inline label. `tag` for genres and traits, `image` for text sitting on
// character art, `badge` for an uppercase role label. `dot` adds a leading marker.
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import styles from './Chip.module.css'

export type ChipVariant = 'tag' | 'image' | 'badge'

type ChipProps = {
  variant?: ChipVariant
  dot?: boolean
  className?: string
  children: ReactNode
}

export function Chip({ variant = 'tag', dot = false, className, children }: ChipProps) {
  return (
    <span className={cn(styles.chip, styles[variant], className)}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
