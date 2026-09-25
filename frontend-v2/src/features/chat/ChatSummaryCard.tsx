// One story on a shelf (Home "Continue your story", My Stories): who, where,
// the last line and when. The whole card links to the chat room.
// lastLine is untrusted model output, so it is rendered as plain text only.
import { Link } from 'react-router'
import { Chip } from '@/components/Chip'
import { Avatar } from '@/components/Portrait'
import { paths } from '@/lib/paths'
import { formatRelativeTime } from '@/lib/time'
import type { ChatSummary } from '@/lib/types'
import styles from './ChatSummaryCard.module.css'

export function ChatSummaryCard({ chat }: { chat: ChatSummary }) {
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <Avatar name={chat.character.name} src={chat.character.avatarUrl} size={48} />
        <div className={styles.who}>
          <h3 className={styles.name}>
            <Link to={paths.chat(chat.id)} className={styles.link}>
              {chat.character.name}
            </Link>
          </h3>
          <p className={styles.scene}>
            {chat.sceneLabel} · Chapter {chat.chapter}
          </p>
        </div>
      </div>
      <p className={styles.line}>{chat.lastLine}</p>
      <div className={styles.foot}>
        <time className={styles.time} dateTime={chat.updatedAt}>
          {formatRelativeTime(chat.updatedAt)}
        </time>
        <Chip variant="badge">{chat.character.role}</Chip>
      </div>
    </article>
  )
}
