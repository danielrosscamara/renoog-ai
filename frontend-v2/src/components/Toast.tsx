// Toaster: renders the toast queue from toastStore. Mount it once (AppShell).
// Errors use role="alert" so they are announced right away; others use "status".
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { IconButton } from './Button'
import { toast, useToasts, type ToastKind } from './toastStore'
import styles from './Toast.module.css'

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert } satisfies Record<ToastKind, unknown>

export function Toaster() {
  const toasts = useToasts()

  return (
    <section aria-label="Notifications" className={styles.region}>
      {toasts.map((item) => {
        const Icon = ICONS[item.kind]
        return (
          <div
            key={item.id}
            role={item.kind === 'error' ? 'alert' : 'status'}
            className={cn(styles.toast, styles[item.kind])}
          >
            <Icon aria-hidden="true" size={20} className={styles.icon} />
            <p className={styles.message}>{item.message}</p>
            <IconButton label="Dismiss notification" size="sm" onClick={() => toast.dismiss(item.id)}>
              <X size={16} />
            </IconButton>
          </div>
        )
      })}
    </section>
  )
}
