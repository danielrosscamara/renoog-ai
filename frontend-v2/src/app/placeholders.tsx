// Temporary pages for every route until the real feature views land.
// Each is a title, one line and a link back home, and sets the tab title.
import { Link } from 'react-router'
import { useDocumentTitle } from '../lib/hooks/useDocumentTitle'
import { paths } from '../lib/paths'
import styles from './placeholders.module.css'

type PlaceholderProps = {
  title: string
  line: string
  /** Tab title; defaults to `title`. Pass null for just "Renoog AI". */
  tabTitle?: string | null
}

function Placeholder({ title, line, tabTitle }: PlaceholderProps) {
  useDocumentTitle(tabTitle === undefined ? title : (tabTitle ?? undefined))
  return (
    <section className={`container ${styles.page}`}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.line}>{line}</p>
      <Link to={paths.home} className={styles.back}>
        Back home
      </Link>
    </section>
  )
}

export function HomePage() {
  return <Placeholder title="Home" line="Pick up a story or meet someone new." tabTitle={null} />
}

export function GalleryPage() {
  return <Placeholder title="Gallery" line="Browse characters to talk to." />
}

export function StoriesPage() {
  return <Placeholder title="My Stories" line="Your ongoing chats will show up here." />
}

export function ChatPage() {
  return <Placeholder title="Chat" line="The conversation view is coming soon." />
}

export function NewCharacterPage() {
  return <Placeholder title="New character" line="Create or import a character card." />
}

export function CharacterPage() {
  return <Placeholder title="Character" line="Character details are coming soon." />
}

export function PersonasPage() {
  return <Placeholder title="Personas" line="Choose who you are in your stories." />
}

export function SettingsPage() {
  return <Placeholder title="Settings" line="Account and app preferences." />
}

export function NotFoundPage() {
  return <Placeholder title="Page not found" line="That page doesn't exist or was moved." />
}
