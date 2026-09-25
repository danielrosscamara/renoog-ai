// "Chatting as" list inside the account menu: every persona as a radio item,
// with a check on the active one. Must render inside a Radix DropdownMenu.Content.
// Picking one switches at once (optimistic) and keeps the menu open so you can
// see the change. Persona names are untrusted: plain text only.
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Avatar } from '@/components/Portrait'
import { Skeleton } from '@/components/Skeleton'
import { activePersonaQuery, personasQuery, useSetActivePersona } from './queries'
import styles from './PersonaSwitcher.module.css'

export function PersonaSwitcher() {
  const personas = useQuery(personasQuery)
  const active = useQuery(activePersonaQuery)
  const setActive = useSetActivePersona()

  function choose(id: string) {
    const persona = personas.data?.find((p) => p.id === id)
    if (persona && persona.id !== active.data?.id) setActive.mutate(persona)
  }

  return (
    <>
      <DropdownMenu.Label className={styles.label}>Chatting as</DropdownMenu.Label>

      {personas.isPending ? (
        <div className={styles.loading} aria-label="Loading personas">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} height={28} />
          ))}
        </div>
      ) : personas.isError ? (
        <p role="alert" className={styles.note}>Couldn’t load your personas.</p>
      ) : (
        <DropdownMenu.RadioGroup value={active.data?.id ?? ''} onValueChange={choose} className={styles.list}>
          {personas.data.map((persona) => (
            <DropdownMenu.RadioItem
              key={persona.id}
              value={persona.id}
              className={styles.item}
              // Keep the menu open so the new check mark and avatar are visible.
              onSelect={(event) => event.preventDefault()}
            >
              <Avatar name={persona.name} src={persona.avatarUrl} size={28} />
              <span className={styles.name}>{persona.name}</span>
              <DropdownMenu.ItemIndicator className={styles.check}>
                <Check aria-hidden="true" size={18} />
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      )}
    </>
  )
}
