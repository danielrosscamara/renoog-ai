// ChatIndex: redirects to the newest chat, or shows the empty state with its two actions.
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/lib/api'
import { server } from '@/mocks/server'
import { makeChat } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { ChatIndex } from './ChatIndex'

describe('ChatIndex', () => {
  it('redirects to the latest chat (the first one the API returns)', async () => {
    server.use(
      http.get(apiUrl('/chats'), () =>
        HttpResponse.json([makeChat({ id: 'chat-newest' }), makeChat({ id: 'chat-older' })]),
      ),
    )
    const { router } = renderRoute(<ChatIndex />, { path: '/chat' })

    await waitFor(() => expect(router.state.location.pathname).toBe('/chat/chat-newest'))
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('shows the empty state when there are no chats', async () => {
    server.use(http.get(apiUrl('/chats'), () => HttpResponse.json([])))
    const { router } = renderRoute(<ChatIndex />, { path: '/chat' })

    expect(await screen.findByText('No stories yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse Gallery' })).toHaveAttribute('href', '/gallery')
    expect(screen.getByRole('link', { name: 'Create companion' })).toHaveAttribute('href', '/characters/new')
    expect(router.state.location.pathname).toBe('/chat')
  })
})
