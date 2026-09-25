// Gallery: results, URL state (?q=&genre=&sort=&view=), bookmarks, and the
// loading, empty and error states.
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/Toast'
import { toast } from '@/components/toastStore'
import { apiUrl } from '@/lib/api'
import { server } from '@/mocks/server'
import { renderRoute } from '@/test/render'
import { GalleryView } from './GalleryView'

const renderGallery = (url = '/gallery') =>
  renderRoute(
    <>
      <GalleryView />
      <Toaster />
    </>,
    { path: '/gallery', url },
  )

const search = (router: { state: { location: { search: string } } }) =>
  new URLSearchParams(router.state.location.search)

const cardNames = () =>
  screen.getAllByRole('article').map((card) => within(card).getAllByRole('link')[0]!.textContent)

afterEach(() => {
  act(() => toast.clear())
})

describe('GalleryView', () => {
  it('lists every character, with a count and a create card', async () => {
    renderGallery()

    expect(await screen.findByText('13 characters')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(13)
    expect(screen.getByRole('link', { name: 'Sylvan' })).toHaveAttribute('href', '/characters/sylvan')
    expect(screen.getByRole('link', { name: /Create a companion/ })).toHaveAttribute('href', '/characters/new')
    expect(screen.getByRole('button', { name: 'All 13' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reads genre, sort and view from the URL', async () => {
    renderGallery('/gallery?genre=mythic&sort=name&view=list')

    await screen.findByText('2 characters')
    expect(cardNames()).toEqual(['Bramble', 'Lyra the Apprentice'])
    expect(screen.getByRole('button', { name: /^Mythic Tales/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue('name')
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('falls back to defaults for unknown URL values', async () => {
    renderGallery('/gallery?genre=space-opera&sort=bogus&view=cards')

    expect(await screen.findByText('13 characters')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveValue('recent')
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('writes genre, sort and view changes to the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderGallery()
    await screen.findByText('13 characters')

    await user.click(screen.getByRole('button', { name: /^Cozy Mystery/ }))
    expect(await screen.findByText('2 characters')).toBeInTheDocument()
    expect(search(router).get('genre')).toBe('cozy-mystery')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'name')
    await waitFor(() => expect(cardNames()).toEqual(['Clara Finch', 'Professor Vane']))
    expect(search(router).get('sort')).toBe('name')

    await user.click(screen.getByRole('button', { name: 'List view' }))
    expect(search(router).get('view')).toBe('list')

    // Defaults are left out of the URL.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'recent')
    await user.click(screen.getByRole('button', { name: 'Grid view' }))
    expect(search(router).has('sort')).toBe(false)
    expect(search(router).has('view')).toBe(false)
  })

  it('searches after a pause in typing, replacing the history entry', async () => {
    const user = userEvent.setup()
    const { router } = renderGallery()
    await screen.findByText('13 characters')

    await user.type(screen.getByRole('searchbox', { name: 'Search characters' }), 'clara')
    await waitFor(() => expect(search(router).get('q')).toBe('clara'))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(await screen.findByText('1 character')).toBeInTheDocument()
    expect(cardNames()).toEqual(['Clara Finch'])
  })

  it('shows a no match state that clears the filters', async () => {
    const user = userEvent.setup()
    const { router } = renderGallery('/gallery?q=zzz&genre=mythic')

    expect(await screen.findByText('No characters match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('13 characters')).toBeInTheDocument()
    expect(search(router).toString()).toBe('')
    expect(screen.getByRole('searchbox', { name: 'Search characters' })).toHaveValue('')
  })

  it('shows an empty state when there are no characters at all', async () => {
    server.use(http.get(apiUrl('/characters'), () => HttpResponse.json({ items: [], total: 0, genreCounts: {} })))
    renderGallery()

    expect(await screen.findByText('No characters yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create companion' })).toHaveAttribute('href', '/characters/new')
  })

  it('shows an error with a retry', async () => {
    server.use(
      http.get(apiUrl('/characters'), () => HttpResponse.json({ code: 'internal_error', message: 'x' }, { status: 500 }), { once: true }),
    )
    const user = userEvent.setup()
    renderGallery()

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the Gallery')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('13 characters')).toBeInTheDocument()
  })

  it('bookmarks a character with PATCH /characters/:id', async () => {
    const user = userEvent.setup()
    renderGallery()
    const button = await screen.findByRole('button', { name: 'Bookmark Clara Finch' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bookmark Clara Finch' })).toHaveAttribute('aria-pressed', 'true'))

    await user.click(screen.getByRole('button', { name: 'Bookmark Clara Finch' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bookmark Clara Finch' })).toHaveAttribute('aria-pressed', 'false'))
  })

  it('keeps the bookmark unchanged and explains when saving fails', async () => {
    server.use(http.patch(apiUrl('/characters/:id'), () => HttpResponse.json({ code: 'internal_error', message: 'x' }, { status: 500 })))
    const user = userEvent.setup()
    renderGallery()

    await user.click(await screen.findByRole('button', { name: 'Bookmark Clara Finch' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t update the bookmark')
    expect(screen.getByRole('button', { name: 'Bookmark Clara Finch' })).toHaveAttribute('aria-pressed', 'false')
  })
})
