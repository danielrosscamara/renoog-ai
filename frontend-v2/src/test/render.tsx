import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

/** Render a route element inside a fresh QueryClient + memory router. */
export function renderRoute(element: ReactElement, { path = '/', url }: { path?: string; url?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter([{ path, element }, { path: '*', element: <p>elsewhere</p> }], { initialEntries: [url ?? path] })
  return { ...render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>), router, client }
}
