// Site footer: brand, minors notice, the AI disclosure line and the copyright year.
import { MinorsNotice } from '../../features/safety'
import { cn } from '../../lib/cn'
import styles from './Footer.module.css'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={cn('container', styles.inner)}>
        <p className={styles.brand}>Renoog AI</p>
        <MinorsNotice />
        <p className={styles.line}>Characters are AI, not real people.</p>
        <p className={styles.line}>© {year} Renoog AI</p>
      </div>
    </footer>
  )
}
