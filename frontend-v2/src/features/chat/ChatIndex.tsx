// /chat with no id: jumps to your latest chat (the API sorts newest first),
// or shows an empty state that points to the Gallery and the character builder.
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router'
import { BookOpen, Compass, Sparkles } from 'lucide-react'
import { Button, ButtonLink } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { paths } from '@/lib/paths'
import { allChatsQuery } from './queries'
import styles from './ChatIndex.module.css'

export function ChatIndex() {
  const chats = useQuery(allChatsQuery)

  if (chats.isPending) {
    return (
      <div className="container">
        <Skeleton height={200} />
      </div>
    )
  }

  if (chats.isError) {
    return (
      <div className="container">
        <StateMessage
          role="alert"
          title="Couldn’t load your stories"
          body="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => void chats.refetch()}>Try again</Button>}
        />
      </div>
    )
  }

  const latest = chats.data[0]
  if (latest) return <Navigate replace to={paths.chat(latest.id)} />

  return (
    <div className="container">
      <StateMessage
        icon={BookOpen}
        title="No stories yet"
        body="Find a character in the Gallery, or make your own companion, to start your first story."
        action={
          <div className={styles.actions}>
            <ButtonLink to={paths.gallery} leadingIcon={<Compass size={18} />}>
              Browse Gallery
            </ButtonLink>
            <ButtonLink to={paths.newCharacter} variant="secondary" leadingIcon={<Sparkles size={18} />}>
              Create companion
            </ButtonLink>
          </div>
        }
      />
    </div>
  )
}
