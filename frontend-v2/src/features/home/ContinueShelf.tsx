// "Continue your story": your most recent chats, newest first, as a shelf.
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Compass } from 'lucide-react'
import { Button, ButtonLink } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { ChatSummaryCard, recentChatsQuery } from '@/features/chat'
import { paths } from '@/lib/paths'
import styles from './HomeView.module.css'

export function ContinueShelf() {
  const chats = useQuery(recentChatsQuery)
  const hasChats = (chats.data?.length ?? 0) > 0

  return (
    <section aria-labelledby="continue-heading" className={styles.section}>
      <SectionHeader
        id="continue-heading"
        title="Continue your story"
        action={hasChats && <ButtonLink to={paths.stories} variant="ghost" size="sm">All stories</ButtonLink>}
      />

      {chats.isPending ? (
        <ul className={styles.shelf} aria-label="Loading stories">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <Skeleton height={156} className={styles.cardSkeleton} />
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
      ) : !hasChats ? (
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
        <ul className={styles.shelf}>
          {chats.data.map((chat) => (
            <li key={chat.id}>
              <ChatSummaryCard chat={chat} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
