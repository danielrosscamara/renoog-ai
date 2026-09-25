// Chat room frame: StoryRail | the routed chat | CharacterPanel.
// Both side columns collapse; the rail shrinks to avatars, the panel to its toggle.
// The panel follows the open chat's character (or ?character= on /chat/new).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useParams, useSearchParams } from 'react-router'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'
import { CharacterPanel } from './CharacterPanel'
import { StoryRail } from './StoryRail'
import { chatQuery } from './queries'
import styles from './ChatLayout.module.css'

export function ChatLayout() {
  useDocumentTitle('Chat Room')
  const { chatId = '' } = useParams()
  const [sp] = useSearchParams()
  const [railOpen, setRailOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const chat = useQuery(chatQuery(chatId))

  const characterId = chat.data?.character.id ?? (chatId === 'new' ? (sp.get('character') ?? '') : '')

  return (
    <div className={cn(styles.layout, !railOpen && styles.railCollapsed, !panelOpen && styles.panelCollapsed)}>
      <StoryRail collapsed={!railOpen} onToggle={() => setRailOpen((open) => !open)} />
      <div className={styles.main}>
        <Outlet />
      </div>
      <CharacterPanel
        characterId={characterId}
        collapsed={!panelOpen}
        onToggle={() => setPanelOpen((open) => !open)}
      />
    </div>
  )
}
