// Settings, opened from the account menu ("Settings…"). No page and no URL.
// Desktop: section tabs on the left, content on the right. Phone (< 640px):
// one scrolling list with a heading per section. Changes apply at once, so
// there is no Save button. Browser only settings live in useSettingsStore;
// server settings go through TanStack Query (see queries.ts).
//
// Later, on purpose not here yet:
// - API key: arrives with OpenRouter (backend build step 8).
// - Account, log out, export, delete account: Phase 2, with auth.
// - Adult content: needs an owner and a legal decision (age verification) first.
import type { ComponentType, RefObject } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Dialog } from '@/components/Dialog'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { AboutSection } from './AboutSection'
import { AppearanceSection } from './AppearanceSection'
import { ChatSection } from './ChatSection'
import { DataSection } from './DataSection'
import styles from './SettingsDialog.module.css'

const SECTIONS: ReadonlyArray<{ id: string; title: string; Content: ComponentType }> = [
  { id: 'appearance', title: 'Appearance', Content: AppearanceSection },
  { id: 'chat', title: 'Chat', Content: ChatSection },
  { id: 'data', title: 'Data', Content: DataSection },
  { id: 'about', title: 'About', Content: AboutSection },
]

/** Matches the Dialog's own switch to a full screen sheet. */
const DESKTOP_QUERY = '(min-width: 640px)'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where focus goes when it closes (the account menu trigger). */
  returnFocusTo?: RefObject<HTMLElement | null>
}

export function SettingsDialog({ open, onOpenChange, returnFocusTo }: SettingsDialogProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY)

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings" returnFocusTo={returnFocusTo}>
      {desktop ? (
        <Tabs.Root defaultValue={SECTIONS[0]!.id} orientation="vertical" className={styles.tabs}>
          <Tabs.List aria-label="Settings sections" className={styles.tabList}>
            {SECTIONS.map(({ id, title }) => (
              <Tabs.Trigger key={id} value={id} className={styles.tab}>
                {title}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {SECTIONS.map(({ id, title, Content }) => (
            <Tabs.Content key={id} value={id} className={styles.panel}>
              <h3 className={styles.sectionTitle}>{title}</h3>
              <Content />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      ) : (
        <div className={styles.list}>
          {SECTIONS.map(({ id, title, Content }) => (
            <section key={id} aria-labelledby={`settings-${id}`} className={styles.panel}>
              <h3 id={`settings-${id}`} className={styles.sectionTitle}>{title}</h3>
              <Content />
            </section>
          ))}
        </div>
      )}
    </Dialog>
  )
}
