import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/toastStore'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { UserSettings, UserSettingsPatch } from '@/lib/types'

/** Server side settings (default style, model, reply length). */
export const settingsQuery = queryOptions({
  queryKey: queryKeys.settings,
  queryFn: ({ signal }) => api.getSettings(signal),
})

/** Story style presets: ids and labels only. */
export const presetsQuery = queryOptions({
  queryKey: queryKeys.presets,
  queryFn: ({ signal }) => api.listPresets(signal),
  staleTime: 5 * 60_000,
})

export const modelsQuery = queryOptions({
  queryKey: queryKeys.models,
  queryFn: ({ signal }) => api.listModels(signal),
  staleTime: 5 * 60_000,
})

const UPDATE_SETTINGS_KEY = ['settings', 'update'] as const

/**
 * PATCH /settings, optimistic: the cached settings change at once so the
 * control shows the new value. On failure it rolls back and shows a toast.
 *
 * One scope, so quick changes are sent one after another, in order: the last
 * choice is also the last PATCH the server sees. While a newer change is still
 * waiting, an older answer (or rollback) is not written to the cache, or the
 * screen would jump back to an older choice; when the last one settles the
 * settings are refetched, so the screen always ends on what the server has.
 */
export function useUpdateSettings() {
  const client = useQueryClient()
  // Callbacks run while their own mutation is still pending, so 1 means "only me".
  const isLatest = () => client.isMutating({ mutationKey: UPDATE_SETTINGS_KEY }) <= 1

  return useMutation({
    mutationKey: UPDATE_SETTINGS_KEY,
    scope: { id: 'settings' },
    mutationFn: (patch: UserSettingsPatch) => api.updateSettings(patch),
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: queryKeys.settings })
      const previous = client.getQueryData<UserSettings>(queryKeys.settings)
      if (previous) client.setQueryData<UserSettings>(queryKeys.settings, { ...previous, ...patch })
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (isLatest() && context?.previous) client.setQueryData(queryKeys.settings, context.previous)
      toast.error('Couldn’t save that setting. Please try again.')
    },
    onSuccess: (saved) => {
      if (isLatest()) client.setQueryData(queryKeys.settings, saved)
    },
    onSettled: () => (isLatest() ? client.invalidateQueries({ queryKey: queryKeys.settings }) : undefined),
  })
}
