// Segmented control for the Settings dialog: a native radio group styled as
// one pill bar, so arrows, Tab and screen readers work as for any radio group.
import { useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './Segmented.module.css'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
}

type SegmentedProps<T extends string> = {
  legend: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Short help under the control. */
  hint?: string
}

export function Segmented<T extends string>({ legend, options, value, onChange, hint }: SegmentedProps<T>) {
  const name = useId()
  const hintId = useId()

  return (
    <fieldset className={styles.fieldset} aria-describedby={hint ? hintId : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.track}>
        {options.map(({ value: optionValue, label, icon: Icon }) => (
          <label key={optionValue} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
              className={styles.input}
            />
            {Icon && <Icon aria-hidden="true" size={16} />}
            <span>{label}</span>
          </label>
        ))}
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </fieldset>
  )
}
