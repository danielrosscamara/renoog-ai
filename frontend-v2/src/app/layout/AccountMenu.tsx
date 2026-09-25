// Account menu in the Navbar. The trigger is the active persona's avatar
// (monogram without a picture, a round skeleton while loading, the plain user
// icon if it fails). Inside: the persona switcher, "Settings…" (opens the
// settings dialog, not a page) and, once auth exists, Log out.
// Radix handles the keyboard: Enter, Space or ArrowDown opens, arrows move,
// Escape closes and returns focus to the trigger.
import { useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { usePrefetchQuery, useQuery } from '@tanstack/react-query'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { Avatar } from '@/components/Portrait'
import { Skeleton } from '@/components/Skeleton'
import { activePersonaQuery, PersonaSwitcher, personasQuery } from '@/features/personas'
import { SettingsDialog } from '@/features/settings'
import styles from './AccountMenu.module.css'

/** Phase 1 has no auth, so Log out stays hidden until this is 'true'. */
const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true'

const TRIGGER_SIZE = 32

function handleLogout() {
  // TODO(Phase 2): POST /auth/logout, then queryClient.clear(), then navigate to '/'.
}

export function AccountMenu() {
  const persona = useQuery(activePersonaQuery)
  // Load the persona list before the menu opens. Otherwise a keyboard open
  // focuses "Settings…" first and the personas appear above it a moment later.
  usePrefetchQuery(personasQuery)
  const name = persona.data?.name
  const [settingsOpen, setSettingsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          ref={triggerRef}
          className={styles.trigger}
          aria-label={name ? `Account menu, chatting as ${name}` : 'Account menu'}
        >
          {persona.data ? (
            <Avatar name={persona.data.name} src={persona.data.avatarUrl} size={TRIGGER_SIZE} />
          ) : persona.isPending ? (
            <Skeleton round width={TRIGGER_SIZE} height={TRIGGER_SIZE} />
          ) : (
            <UserRound aria-hidden="true" size={20} />
          )}
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content loop align="end" sideOffset={8} collisionPadding={8} className={styles.content}>
            <PersonaSwitcher />

            <DropdownMenu.Separator className={styles.separator} />
            <DropdownMenu.Item className={styles.item} onSelect={() => setSettingsOpen(true)}>
              <Settings aria-hidden="true" size={18} className={styles.icon} />
              Settings…
            </DropdownMenu.Item>

            {AUTH_ENABLED && (
              <>
                <DropdownMenu.Separator className={styles.separator} />
                <DropdownMenu.Item className={styles.item} onSelect={handleLogout}>
                  <LogOut aria-hidden="true" size={18} className={styles.icon} />
                  Log out
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} returnFocusTo={triggerRef} />
    </>
  )
}
