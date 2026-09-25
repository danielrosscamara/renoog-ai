// Error page for anything a route throws while loading or rendering.
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { useDocumentTitle } from '../lib/hooks/useDocumentTitle'
import { paths } from '../lib/paths'
import styles from './placeholders.module.css'

export function RouterError() {
  const error = useRouteError()
  useDocumentTitle('Something went wrong')
  const line = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong while loading this page. Try again in a moment.'

  return (
    <section role="alert" className={`container ${styles.page}`}>
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.line}>{line}</p>
      <Link to={paths.home} className={styles.back}>
        Back home
      </Link>
    </section>
  )
}
