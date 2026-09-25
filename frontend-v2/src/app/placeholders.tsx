// Temporary pages for the routes whose feature views haven't landed yet.
// Each is a title, one line and a link back home, and sets the tab title.
import { Link } from 'react-router'
import { useDocumentTitle } from '../lib/hooks/useDocumentTitle'
import { paths } from '../lib/paths'
import styles from './placeholders.module.css'

type PlaceholderProps = {
  title: string
  line: string
}

function Placeholder({ title, line }: PlaceholderProps) {
  useDocumentTitle(title)
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

export function NewCharacterPage() {
  return <Placeholder title="New character" line="Create or import a character card." />
}

export function CharacterPage() {
  return <Placeholder title="Character" line="Character details are coming soon." />
}

export function NotFoundPage() {
  return <Placeholder title="Page not found" line="That page doesn't exist or was moved." />
}
