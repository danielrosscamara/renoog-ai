// Settings → About: app version (package.json, injected by vite.config.ts)
// and the safety and support text from features/safety.
import { CRISIS_SUPPORT_TEXT } from '@/features/safety'
import styles from './SettingsDialog.module.css'

export function AboutSection() {
  return (
    <>
      <dl className={styles.facts}>
        <dt>App</dt>
        <dd>Renoog AI</dd>
        <dt>Version</dt>
        <dd>{import.meta.env.VITE_APP_VERSION}</dd>
      </dl>
      <div className={styles.field}>
        <h4 className={styles.fieldLabel}>Safety &amp; support</h4>
        <p className={styles.support}>{CRISIS_SUPPORT_TEXT}</p>
      </div>
    </>
  )
}
