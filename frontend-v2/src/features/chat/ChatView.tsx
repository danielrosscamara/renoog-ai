import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'
import { ArrowLeft, MessagesSquare, MapPinOff } from 'lucide-react'
import { ButtonLink, IconLink } from '@/components/Button'
import { Avatar } from '@/components/Portrait'
import { StateMessage } from '@/components/StateMessage'
import { paths } from '@/lib/paths'
import { AiLabel } from '@/features/safety'
import { ApiError } from '@/lib/api'
import { chatQuery } from './queries'
import styles from './ChatView.module.css'

/**
 * Chat room layout stub. Loads the chat by id (works for any chat, not just recent ones).
 * Streaming (lib/streamChat.ts + lib/parseSSE.ts), the stop button, CrisisBanner and
 * message rendering land here once backend /chat/stream exists.
 */
export function ChatView() {
  const { chatId = '' } = useParams()
  const [sp] = useSearchParams()
  const isNew = chatId === 'new'
  const chat = useQuery(chatQuery(chatId))

  if (chat.error instanceof ApiError && chat.error.status === 404) {
    return (
      <div className="container">
        <StateMessage
          icon={MapPinOff}
          title="This story isn’t on your shelf"
          body="It may have been deleted, or the link is wrong."
          action={<ButtonLink to={paths.stories} variant="secondary">My Stories</ButtonLink>}
        />
      </div>
    )
  }

  const name = chat.data?.character.name ?? (isNew ? 'New story' : '…')

  return (
    <div className="container">
      <header className={styles.header}>
        <div className={styles.who}>
          <IconLink to={paths.stories} label="Back to My Stories" size="sm">
            <ArrowLeft size={18} />
          </IconLink>
          <Avatar name={name} src={chat.data?.character.avatarUrl ?? null} size={40} />
          <h1 className={styles.name}>{name}</h1>
        </div>
        <AiLabel />
      </header>

      <StateMessage
        icon={MessagesSquare}
        title="The chat room is being built"
        body={isNew && sp.get('character') ? 'A new chapter will begin here once streaming is connected.' : 'Your chapter will continue here once streaming is connected.'}
        action={<ButtonLink to={paths.gallery} variant="secondary">Back to the Gallery</ButtonLink>}
      />
    </div>
  )
}
