import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/toastStore'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Persona } from '@/lib/types'

/** Every persona you can chat as, sorted by name (server side). */
export const personasQuery = queryOptions({
  queryKey: queryKeys.persona.list,
  queryFn: ({ signal }) => api.listPersonas(signal),
})

/** The persona you're chatting as, e.g. for the account menu and the Home greeting. */
export const activePersonaQuery = queryOptions({
  queryKey: queryKeys.persona.active,
  queryFn: ({ signal }) => api.getActivePersona(signal),
})

/**
 * Switches the active persona (PUT /personas/active). Optimistic: the cached
 * active persona changes at once, so the trigger avatar and the check mark move
 * before the server answers. On failure it rolls back and shows a toast.
 * Either way the persona queries are refetched afterwards.
 */
export function useSetActivePersona() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (persona: Persona) => api.setActivePersona(persona.id),
    onMutate: async (persona) => {
      await client.cancelQueries({ queryKey: queryKeys.persona.active })
      const previous = client.getQueryData<Persona>(queryKeys.persona.active)
      client.setQueryData(queryKeys.persona.active, persona)
      return { previous }
    },
    onError: (_error, persona, context) => {
      if (context?.previous) client.setQueryData(queryKeys.persona.active, context.previous)
      toast.error(`Couldn’t switch to ${persona.name}. Please try again.`)
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.persona.all }),
  })
}
