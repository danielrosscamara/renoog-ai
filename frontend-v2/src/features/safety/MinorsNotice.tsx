// Footer notice for minors. Neutral styling on purpose: safety copy never uses
// the accent colour. The wording lives in copy.ts and is fixed.
import { MINORS_NOTICE_TEXT } from './copy'
import styles from './MinorsNotice.module.css'

export function MinorsNotice() {
  return <p className={styles.notice}>{MINORS_NOTICE_TEXT}</p>
}
