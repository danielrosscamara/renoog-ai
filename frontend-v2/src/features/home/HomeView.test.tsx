// Home: greeting by persona and time of day, story shelf, featured row, banner.
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '@/lib/api'
import { server } from '@/mocks/server'
import { makeChat } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { HomeView } from './HomeView'

beforeEach(() => {
  // Only Date is faked, so MSW and waitFor keep their real timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 20, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HomeView', () => {
  it('greets the active persona by name for the time of day', async () => {
    renderRoute(<HomeView />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Good evening, Ren' })).toBeInTheDocument()
    expect(
      screen.getByText('The lamp is lit and your storytellers are waiting. Pick up where you left off.'),
    ).toBeInTheDocument()
  })

  it('shows the persona name as plain text, not a link', async () => {
    renderRoute(<HomeView />)
    const heading = await screen.findByRole('heading', { level: 1, name: 'Good evening, Ren' })

    expect(within(heading).queryByRole('link')).not.toBeInTheDocument()
  })

  it('counts stories in progress above the greeting', async () => {
    renderRoute(<HomeView />)

    expect(await screen.findByText('3 stories in progress')).toBeInTheDocument()
  })

  it('uses the singular for one story', async () => {
    server.use(http.get(apiUrl('/chats'), () => HttpResponse.json([makeChat()])))
    renderRoute(<HomeView />)

    expect(await screen.findByText('1 story in progress')).toBeInTheDocument()
  })

  it('still greets you when the persona fails to load', async () => {
    server.use(http.get(apiUrl('/personas/active'), () => HttpResponse.json({ code: 'internal_error', message: 'x' }, { status: 500 })))
    renderRoute(<HomeView />)

    await screen.findByRole('link', { name: 'Rowan of the Hearth' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Good evening$/)
  })

  it('shows recent stories linking to their chats, with a link to all stories', async () => {
    renderRoute(<HomeView />)
    const shelf = screen.getByRole('region', { name: 'Continue your story' })

    expect(await within(shelf).findByRole('link', { name: 'Rowan of the Hearth' })).toHaveAttribute('href', '/chat/chat-rowan')
    expect(within(shelf).getByRole('link', { name: 'Professor Vane' })).toHaveAttribute('href', '/chat/chat-vane')
    expect(within(shelf).getByRole('link', { name: 'All stories' })).toHaveAttribute('href', '/stories')
  })

  it('shows a warm empty shelf when there are no stories', async () => {
    server.use(http.get(apiUrl('/chats'), () => HttpResponse.json([])))
    renderRoute(<HomeView />)
    const shelf = screen.getByRole('region', { name: 'Continue your story' })

    expect(await within(shelf).findByText('No stories yet')).toBeInTheDocument()
    expect(within(shelf).getByText('Pick a companion to begin.')).toBeInTheDocument()
    expect(within(shelf).getByRole('link', { name: 'Browse Gallery' })).toHaveAttribute('href', '/gallery')
    expect(within(shelf).queryByRole('link', { name: 'All stories' })).not.toBeInTheDocument()
    expect(screen.queryByText(/in progress/)).not.toBeInTheDocument()
  })

  it('shows an error with a retry when stories fail to load', async () => {
    let calls = 0
    server.use(
      http.get(apiUrl('/chats'), () => {
        calls += 1
        return calls === 1
          ? HttpResponse.json({ code: 'internal_error', message: 'x' }, { status: 500 })
          : HttpResponse.json([makeChat({ id: 'chat-back' })])
      }),
    )
    renderRoute(<HomeView />)
    const shelf = screen.getByRole('region', { name: 'Continue your story' })

    expect(await within(shelf).findByRole('alert')).toHaveTextContent('Couldn’t load your stories')
    within(shelf).getByRole('button', { name: 'Try again' }).click()
    expect(await within(shelf).findByRole('link', { name: 'Rowan of the Hearth' })).toHaveAttribute('href', '/chat/chat-back')
  })

  it('shows featured characters', async () => {
    renderRoute(<HomeView />)
    const featured = screen.getByRole('region', { name: 'Featured characters' })

    expect(await within(featured).findByRole('link', { name: 'Barnaby the Herbalist' })).toHaveAttribute('href', '/characters/barnaby')
    expect(within(featured).getAllByRole('article')).toHaveLength(6)
  })

  it('invites you to create a companion', () => {
    renderRoute(<HomeView />)
    const banner = screen.getByRole('region', { name: 'Make your own companion' })

    expect(within(banner).getByRole('link', { name: 'Create companion' })).toHaveAttribute('href', '/characters/new')
  })
})
