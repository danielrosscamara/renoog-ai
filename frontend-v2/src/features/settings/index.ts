// Public surface of the settings feature.
export { SettingsDialog } from './SettingsDialog'
export {
  CHAT_FONT_SIZES,
  CHAT_TEXT_SIZE_STORAGE_KEY,
  SEND_WITH_STORAGE_KEY,
  THEME_STORAGE_KEY,
  useSettingsStore,
} from './useSettingsStore'
export type { ChatTextSize, SendWith, Theme, ThemePreference } from './useSettingsStore'
export { modelsQuery, presetsQuery, settingsQuery, useUpdateSettings } from './queries'
