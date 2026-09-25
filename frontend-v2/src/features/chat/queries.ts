import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

/** Home shelf: the few most recent chats. */
export const RECENT_CHATS_LIMIT = 6

export const recentChatsQuery = queryOptions({
  queryKey: queryKeys.chats.list(RECENT_CHATS_LIMIT),
  queryFn: ({ signal }) => api.listChats({ limit: RECENT_CHATS_LIMIT }, signal),
})

/** My Stories: every chat. Add pagination here when chat counts grow. */
export const allChatsQuery = queryOptions({
  queryKey: queryKeys.chats.list(),
  queryFn: ({ signal }) => api.listChats({}, signal),
})

/**
 * Deletes every chat (DELETE /chats). Cached single chats are dropped, not
 * refetched (they'd only 404), and the chat lists are refetched so shelves empty.
 */
export function useDeleteAllChats() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: () => api.deleteAllChats(),
    onSuccess: () => {
      client.removeQueries({ queryKey: queryKeys.chats.details })
      return client.invalidateQueries({ queryKey: queryKeys.chats.lists })
    },
  })
}

export const chatQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.chats.detail(id),
    queryFn: ({ signal }) => api.getChat(id, signal),
    enabled: id !== '' && id !== 'new',
  })
