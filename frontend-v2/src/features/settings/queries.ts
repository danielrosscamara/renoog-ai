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

/**
 * PATCH /settings, optimistic: the cached settings change at once so the
 * control shows the new value. On failure it rolls back and shows a toast.
 */
export function useUpdateSettings() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (patch: UserSettingsPatch) => api.updateSettings(patch),
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: queryKeys.settings })
      const previous = client.getQueryData<UserSettings>(queryKeys.settings)
      if (previous) client.setQueryData<UserSettings>(queryKeys.settings, { ...previous, ...patch })
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) client.setQueryData(queryKeys.settings, context.previous)
      toast.error('Couldn’t save that setting. Please try again.')
    },
    onSuccess: (saved) => client.setQueryData(queryKeys.settings, saved),
  })
}
