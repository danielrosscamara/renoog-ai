// Section heading: optional eyebrow, an h2 with an id (so the section can use
// aria-labelledby), and an optional action on the right.
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import styles from './SectionHeader.module.css'

type SectionHeaderProps = {
  id: string
  title: ReactNode
  eyebrow?: ReactNode
  action?: ReactNode
  className?: string
}

export function SectionHeader({ id, title, eyebrow, action, className }: SectionHeaderProps) {
  return (
    <div className={cn(styles.header, className)}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h2 id={id} className={styles.title}>{title}</h2>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
