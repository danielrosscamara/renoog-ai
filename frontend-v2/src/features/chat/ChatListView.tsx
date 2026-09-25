// /stories ("My Stories"): every chat as a card, in the order the API sends
// them (newest first; lists are sorted server side, never in the browser).
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Compass } from 'lucide-react'
import { Button, ButtonLink } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'
import { paths } from '@/lib/paths'
import { ChatSummaryCard } from './ChatSummaryCard'
import { allChatsQuery } from './queries'
import styles from './ChatListView.module.css'

export function ChatListView() {
  useDocumentTitle('My Stories')
  const chats = useQuery(allChatsQuery)

  return (
    <div className={cn('container', styles.page)}>
      <PageHeader title="My Stories" lead="Every story you’ve started, most recent first." />

      {chats.isPending ? (
        <ul className={styles.grid} aria-label="Loading stories">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton height={156} className={styles.skeleton} />
            </li>
          ))}
        </ul>
      ) : chats.isError ? (
        <StateMessage
          role="alert"
          title="Couldn’t load your stories"
          body="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => void chats.refetch()}>Try again</Button>}
        />
      ) : chats.data.length === 0 ? (
        <StateMessage
          icon={BookOpen}
          title="No stories yet"
          body="Pick a companion to begin."
          action={
            <ButtonLink to={paths.gallery} leadingIcon={<Compass size={18} />}>
              Browse Gallery
            </ButtonLink>
          }
        />
      ) : (
        <ul className={styles.grid}>
          {chats.data.map((chat) => (
            <li key={chat.id}>
              <ChatSummaryCard chat={chat} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
