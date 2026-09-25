// Settings → Appearance: theme and chat text size. Browser only
// (useSettingsStore), applied at once. The Navbar lamp shares the same store.
import { Monitor, Moon, Sun } from 'lucide-react'
import { Segmented, type SegmentedOption } from './Segmented'
import { useSettingsStore, type ChatTextSize, type ThemePreference } from './useSettingsStore'

const THEMES: readonly SegmentedOption<ThemePreference>[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
]

const TEXT_SIZES: readonly SegmentedOption<ChatTextSize>[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export function AppearanceSection() {
  const { themePreference, setTheme, chatTextSize, setChatTextSize } = useSettingsStore()

  return (
    <>
      <Segmented
        legend="Theme"
        options={THEMES}
        value={themePreference}
        onChange={setTheme}
        hint="System follows your device’s light or dark setting."
      />
      <Segmented legend="Chat text size" options={TEXT_SIZES} value={chatTextSize} onChange={setChatTextSize} />
    </>
  )
}
