// My Stories: story cards in API order linking to their chats, plus the
// empty and error states.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/lib/api'
import { server } from '@/mocks/server'
import { makeChat } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { ChatListView } from './ChatListView'

describe('ChatListView', () => {
  it('shows every story in the order the API sends, each linking to its chat', async () => {
    server.use(
      http.get(apiUrl('/chats'), () =>
        HttpResponse.json([
          makeChat({ id: 'chat-new', character: { id: 'a', name: 'Aiden', avatarUrl: null, role: 'mentor' } }),
          makeChat({ id: 'chat-old', character: { id: 'b', name: 'Bramble', avatarUrl: null, role: 'ally' } }),
        ]),
      ),
    )
    renderRoute(<ChatListView />, { path: '/stories' })

    await screen.findByRole('link', { name: 'Aiden' })
    const cards = screen.getAllByRole('article')
    expect(cards.map((card) => within(card).getByRole('link').getAttribute('href'))).toEqual(['/chat/chat-new', '/chat/chat-old'])
  })

  it('shows the scene, chapter, last line, role and relative time', async () => {
    server.use(http.get(apiUrl('/chats'), () => HttpResponse.json([makeChat({ updatedAt: new Date().toISOString() })])))
    renderRoute(<ChatListView />, { path: '/stories' })

    const card = (await screen.findByRole('link', { name: 'Rowan of the Hearth' })).closest('article')!
    expect(card).toHaveTextContent('Campfire Scene · Chapter 4')
    expect(card).toHaveTextContent('The kettle is whistling.')
    expect(card).toHaveTextContent('companion')
    expect(within(card).getByText('Just now').tagName).toBe('TIME')
  })

  it('shows a warm empty state that points to the Gallery', async () => {
    server.use(http.get(apiUrl('/chats'), () => HttpResponse.json([])))
    renderRoute(<ChatListView />, { path: '/stories' })

    expect(await screen.findByText('No stories yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse Gallery' })).toHaveAttribute('href', '/gallery')
  })

  it('shows an error with a retry', async () => {
    server.use(
      http.get(apiUrl('/chats'), () => HttpResponse.json({ code: 'internal_error', message: 'x' }, { status: 500 }), { once: true }),
    )
    const user = userEvent.setup()
    renderRoute(<ChatListView />, { path: '/stories' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load your stories')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: 'Rowan of the Hearth' })).toBeInTheDocument()
  })
})
