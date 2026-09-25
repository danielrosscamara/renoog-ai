// Left column of the chat room: your chats (newest first) with a search box.
// Collapsed, it shows avatars only; each keeps the character name as its
// accessible name and tooltip.
import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router'
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { IconButton } from '@/components/Button'
import { Avatar } from '@/components/Portrait'
import { Skeleton } from '@/components/Skeleton'
import { cn } from '@/lib/cn'
import { paths } from '@/lib/paths'
import type { ChatSummary } from '@/lib/types'
import { allChatsQuery } from './queries'
import styles from './StoryRail.module.css'

type StoryRailProps = {
  collapsed: boolean
  onToggle: () => void
}

function matches(chat: ChatSummary, q: string): boolean {
  return !q || [chat.character.name, chat.sceneLabel].some((field) => field.toLowerCase().includes(q))
}

export function StoryRail({ collapsed, onToggle }: StoryRailProps) {
  const chats = useQuery(allChatsQuery)
  const [query, setQuery] = useState('')
  const listId = useId()

  const q = collapsed ? '' : query.trim().toLowerCase()
  const visible = (chats.data ?? []).filter((chat) => matches(chat, q))

  return (
    <aside aria-label="Your stories" className={cn(styles.rail, collapsed && styles.collapsed)}>
      <div className={styles.head}>
        {!collapsed && <h2 className={styles.heading}>Stories</h2>}
        <IconButton
          label={collapsed ? 'Expand story list' : 'Collapse story list'}
          aria-expanded={!collapsed}
          aria-controls={listId}
          size="sm"
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </IconButton>
      </div>

      {!collapsed && (
        <label className={styles.search}>
          <Search aria-hidden="true" size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search stories"
            aria-label="Search stories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}

      <div id={listId} className={styles.body}>
        {chats.isPending ? (
          <div className={styles.loading}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} height={collapsed ? 40 : 52} round={collapsed} />
            ))}
          </div>
        ) : chats.isError ? (
          !collapsed && <p role="alert" className={styles.note}>Couldn’t load your stories.</p>
        ) : visible.length === 0 ? (
          !collapsed && <p className={styles.note}>{q ? 'No stories match your search.' : 'No stories yet.'}</p>
        ) : (
          <ul className={styles.list}>
            {visible.map((chat) => (
              <li key={chat.id}>
                <NavLink
                  to={paths.chat(chat.id)}
                  aria-label={collapsed ? chat.character.name : undefined}
                  title={collapsed ? chat.character.name : undefined}
                  className={({ isActive }) => cn(styles.item, isActive && styles.active)}
                >
                  <Avatar name={chat.character.name} src={chat.character.avatarUrl} size={40} />
                  {!collapsed && (
                    <span className={styles.text}>
                      <span className={styles.name}>{chat.character.name}</span>
                      <span className={styles.scene}>{chat.sceneLabel} · Chapter {chat.chapter}</span>
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
