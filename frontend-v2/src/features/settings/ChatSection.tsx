// Settings → Chat. "Send with" is browser only (useSettingsStore). Default
// style, model and reply length live on the server (GET/PATCH /settings); each
// change is an optimistic PATCH that rolls back with a toast if it fails.
import { useId } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import type { Model, ModelProvider, ResponseLength } from '@/lib/types'
import { modelsQuery, presetsQuery, settingsQuery, useUpdateSettings } from './queries'
import { Segmented, type SegmentedOption } from './Segmented'
import { useSettingsStore, type SendWith } from './useSettingsStore'
import styles from './SettingsDialog.module.css'

const SEND_WITH: readonly SegmentedOption<SendWith>[] = [
  { value: 'enter', label: 'Enter' },
  { value: 'ctrl-enter', label: 'Ctrl+Enter' },
]

const LENGTHS: readonly SegmentedOption<ResponseLength>[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  ollama: 'On this computer',
  openrouter: 'OpenRouter',
}

type Option = { id: string; label: string; group?: string }

type ServerSelectProps = {
  label: string
  value: string
  list: UseQueryResult<Option[]>
  onChange: (id: string) => void
  /** Text under the select, e.g. the chosen preset's description. */
  hint?: string
}

/**
 * A select whose options come from the server. While the list loads or if it
 * failed, the select still shows the current value but is disabled; a failure
 * adds "Try again". The current value is always an option, even if the list
 * no longer has it, so the select never shows something you didn't pick.
 */
function ServerSelect({ label, value, list, onChange, hint }: ServerSelectProps) {
  const id = useId()
  const hintId = useId()
  const options = list.data ?? []
  const withCurrent = options.some((o) => o.id === value) ? options : [{ id: value, label: value }, ...options]
  const groups = [...new Set(withCurrent.map((o) => o.group))]

  const renderOptions = (items: Option[]) =>
    items.map((o) => (
      <option key={o.id} value={o.id}>
        {o.label}
      </option>
    ))

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      <div className={styles.selectRow}>
        <select
          id={id}
          className={styles.select}
          value={value}
          disabled={!list.isSuccess}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          {groups.length > 1
            ? groups.map((group) => (
                <optgroup key={group ?? 'current'} label={group ?? 'Current'}>
                  {renderOptions(withCurrent.filter((o) => o.group === group))}
                </optgroup>
              ))
            : renderOptions(withCurrent)}
        </select>
        {list.isError && (
          <Button variant="secondary" size="sm" onClick={() => void list.refetch()}>
            Try again
          </Button>
        )}
      </div>
      {list.isError ? (
        <p role="alert" className={styles.fieldHint}>Couldn’t load the choices.</p>
      ) : (
        hint && <p id={hintId} className={styles.fieldHint}>{hint}</p>
      )}
    </div>
  )
}

const toModelOption = (model: Model): Option => ({
  id: model.id,
  label: model.label,
  group: PROVIDER_LABELS[model.provider],
})

/** Module level so `select` keeps one identity and TanStack Query can reuse its result. */
const toModelOptions = (list: Model[]): Option[] => list.map(toModelOption)

export function ChatSection() {
  const { sendWith, setSendWith } = useSettingsStore()
  const settings = useQuery(settingsQuery)
  const presets = useQuery(presetsQuery)
  const models = useQuery({ ...modelsQuery, select: toModelOptions })
  const update = useUpdateSettings()

  return (
    <>
      {/* On touch devices Enter always adds a new line, whatever this says;
          the chat input will check (pointer: coarse) before sending on Enter. */}
      <Segmented
        legend="Send with"
        options={SEND_WITH}
        value={sendWith}
        onChange={setSendWith}
        hint={sendWith === 'enter' ? 'Shift+Enter adds a new line.' : 'Enter adds a new line.'}
      />

      {settings.isPending ? (
        <div className={styles.loading} aria-label="Loading chat settings">
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton height={64} />
        </div>
      ) : settings.isError ? (
        <StateMessage
          role="alert"
          title="Couldn’t load your chat settings"
          body="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => void settings.refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <ServerSelect
            label="Default style"
            value={settings.data.defaultPresetId}
            list={presets}
            hint={presets.data?.find((p) => p.id === settings.data.defaultPresetId)?.description}
            onChange={(defaultPresetId) => update.mutate({ defaultPresetId })}
          />

          {settings.data.modelNotice && (
            <p role="note" className={styles.notice}>
              <Info aria-hidden="true" size={16} className={styles.noticeIcon} />
              <span>{settings.data.modelNotice}</span>
            </p>
          )}
          <ServerSelect
            label="Model"
            value={settings.data.modelId}
            list={models}
            onChange={(modelId) => update.mutate({ modelId })}
          />

          <Segmented
            legend="Reply length"
            options={LENGTHS}
            value={settings.data.responseLength}
            onChange={(responseLength) => update.mutate({ responseLength })}
          />
        </>
      )}
    </>
  )
}
