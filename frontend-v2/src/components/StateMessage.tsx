// Empty states and errors: icon, title, body and an optional action.
// Use role "status" for empty or informational states, "alert" for errors.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/cn'
import styles from './StateMessage.module.css'

type StateMessageProps = {
  icon?: LucideIcon
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  role?: 'status' | 'alert'
  className?: string
}

export function StateMessage({ icon: Icon, title, body, action, role = 'status', className }: StateMessageProps) {
  return (
    <div role={role} className={cn(styles.message, role === 'alert' && styles.alert, className)}>
      {Icon && (
        <span className={styles.icon}>
          <Icon aria-hidden="true" size={24} />
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
