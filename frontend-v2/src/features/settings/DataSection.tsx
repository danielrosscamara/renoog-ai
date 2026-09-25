// Settings → Data: delete every chat. The confirm dialog only enables its
// (danger styled) button once you type DELETE, so it can't happen by accident.
import { useId, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { toast } from '@/components/toastStore'
import { useDeleteAllChats } from '@/features/chat'
import styles from './SettingsDialog.module.css'

const CONFIRM_WORD = 'DELETE'

export function DataSection() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const deleteAll = useDeleteAllChats()
  const confirmed = typed === CONFIRM_WORD

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setTyped('')
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!confirmed || deleteAll.isPending) return
    deleteAll.mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false)
        toast.success('All chats deleted.')
      },
      onError: () => toast.error('Couldn’t delete your chats. Please try again.'),
    })
  }

  return (
    <div className={styles.field}>
      <p className={styles.fieldLabel}>Chats</p>
      <p className={styles.fieldHint}>Permanently delete every story and its messages. Characters and personas stay.</p>
      <div>
        <Button variant="secondary" leadingIcon={<Trash2 size={16} />} onClick={() => setOpen(true)}>
          Delete all chats…
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Delete all chats?"
        description="This removes every story and its messages for good. It can’t be undone."
      >
        <form className={styles.confirm} onSubmit={onSubmit}>
          <label htmlFor={inputId} className={styles.fieldLabel}>
            Type {CONFIRM_WORD} to confirm
          </label>
          <input
            id={inputId}
            className={styles.input}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <div className={styles.confirmActions}>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className={styles.danger} disabled={!confirmed || deleteAll.isPending}>
              {deleteAll.isPending ? 'Deleting…' : 'Delete all chats'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
