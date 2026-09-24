// Shared TanStack Query client. Data stays fresh for 30s, no refetch on window
// focus, and client errors (4xx) are never retried because retrying won't fix them.
import { QueryClient } from '@tanstack/react-query'

const MAX_RETRIES = 3

function isClientError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' && status >= 400 && status < 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
    },
  },
})
