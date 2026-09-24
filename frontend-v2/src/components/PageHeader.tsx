// Page heading: optional eyebrow, the page h1, an optional lead paragraph and an
// optional action on the right.
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import styles from './PageHeader.module.css'

type PageHeaderProps = {
  title: ReactNode
  eyebrow?: ReactNode
  lead?: ReactNode
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, eyebrow, lead, action, className }: PageHeaderProps) {
  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  )
}
