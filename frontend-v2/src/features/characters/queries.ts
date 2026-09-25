import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/toastStore'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Character, CharacterList, CharacterQuery } from '@/lib/types'

/** One character by id, e.g. for the chat room's character panel. */
export const characterQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.characters.detail(id),
    queryFn: ({ signal }) => api.getCharacter(id, signal),
    enabled: id !== '',
  })

/** Gallery results. Keeps the last results on screen while new filters load. */
export const charactersQuery = (query: CharacterQuery) =>
  queryOptions({
    queryKey: queryKeys.characters.list(query),
    queryFn: ({ signal }) => api.listCharacters(query, signal),
    placeholderData: keepPreviousData,
  })

/** Home featured row. */
export const featuredCharactersQuery = queryOptions({
  queryKey: queryKeys.characters.featured,
  queryFn: ({ signal }) => api.listFeaturedCharacters(signal),
})

const replaceIn = (items: Character[], updated: Character) =>
  items.map((item) => (item.id === updated.id ? updated : item))

/**
 * Bookmark toggle (PATCH /characters/:id). The server's answer is written into
 * every cached copy of the character (detail, gallery lists, featured), so all
 * cards agree without a refetch. On failure nothing changes and a toast explains.
 */
export function useBookmarkMutation() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, bookmarked }: { id: string; bookmarked: boolean }) => api.setBookmark(id, bookmarked),
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.characters.detail(updated.id), updated)
      client.setQueriesData<CharacterList>({ queryKey: ['characters', 'list'] }, (list) =>
        list && { ...list, items: replaceIn(list.items, updated) },
      )
      client.setQueryData<Character[]>(queryKeys.characters.featured, (items) => items && replaceIn(items, updated))
    },
    onError: () => {
      toast.error('Couldn’t update the bookmark. Please try again.')
    },
  })
}
