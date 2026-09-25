// Modal dialog: a thin wrapper over @radix-ui/react-dialog. Centered, 560px
// wide, max 80dvh with its own scroll; a full screen sheet under 640px. The
// header holds the title and a close button. Esc, the overlay and the close
// button all close it. Radix returns focus to whatever opened it; pass
// `returnFocusTo` when that element is gone by then (e.g. a menu item).
import type { ReactNode, RefObject } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import styles from './Dialog.module.css'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** Optional line under the title; also becomes the dialog's accessible description. */
  description?: ReactNode
  returnFocusTo?: RefObject<HTMLElement | null>
  children: ReactNode
}

export function Dialog({ open, onOpenChange, title, description, returnFocusTo, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={styles.content}
          // Without a description, say so explicitly (Radix warns otherwise).
          {...(description ? {} : { 'aria-describedby': undefined })}
          onCloseAutoFocus={(event) => {
            const target = returnFocusTo?.current
            if (!target) return
            event.preventDefault()
            target.focus()
          }}
        >
          <header className={styles.header}>
            <div className={styles.titles}>
              <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className={styles.description}>{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close" size="sm">
                <X size={18} />
              </IconButton>
            </RadixDialog.Close>
          </header>
          <div className={styles.body}>{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
