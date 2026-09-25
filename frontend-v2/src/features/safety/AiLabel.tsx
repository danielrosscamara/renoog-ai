// Tells the reader they're talking to an AI. Neutral styling on purpose: safety
// copy never uses the accent colour. The wording lives in copy.ts and is fixed.
import { Bot } from 'lucide-react'
import { AI_LABEL_TEXT } from './copy'
import styles from './AiLabel.module.css'

export function AiLabel() {
  return (
    <span className={styles.label}>
      <Bot aria-hidden="true" size={14} />
      {AI_LABEL_TEXT}
    </span>
  )
}
