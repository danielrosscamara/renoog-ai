// Navbar: exact main links, Chat Room active on a chat, the lamp toggle (data-theme, aria-pressed, storage)
// and the mobile menu closing behaviour.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '../../features/settings'
import { setMediaQuery } from '../../test/matchMedia'
import { Navbar } from './Navbar'

function renderNavbar(url = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '*', Component: Navbar }], { initialEntries: [url] })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('Navbar', () => {
  it('has exactly Home, Gallery, Chat Room and My Stories', () => {
    renderNavbar()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const labels = within(nav).getAllByRole('link').map((link) => link.textContent)
    expect(labels).toEqual(['Home', 'Gallery', 'Chat Room', 'My Stories'])
  })

  it('marks Chat Room as the current page on /chat/:chatId', () => {
    renderNavbar('/chat/chat-rowan')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Chat Room' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('lamp toggle flips data-theme and aria-pressed, and saves the theme', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const html = document.documentElement
    const lamp = screen.getByRole('button', { name: 'Lamplight (dark mode)' })

    const startDark = html.dataset.theme !== 'light'
    expect(lamp).toHaveAttribute('aria-pressed', String(startDark))

    await user.click(lamp)
    const nowDark = !startDark
    expect(html.dataset.theme).toBe(nowDark ? 'dark' : 'light')
    expect(lamp).toHaveAttribute('aria-pressed', String(nowDark))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(nowDark ? 'dark' : 'light')

    await user.click(lamp)
    expect(html.dataset.theme).toBe(startDark ? 'dark' : 'light')
    expect(lamp).toHaveAttribute('aria-pressed', String(startDark))
  })

  it('has the account menu instead of a plain /settings link, with the lamp to its left', async () => {
    renderNavbar()
    const account = await screen.findByRole('button', { name: 'Account menu, chatting as Ren' })
    const lamp = screen.getByRole('button', { name: 'Lamplight (dark mode)' })

    expect(screen.queryByRole('link', { name: 'Account settings' })).not.toBeInTheDocument()
    expect(document.querySelector('a[href="/settings"]')).toBeNull()
    expect(lamp.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('lamp and the Settings theme radios stay in sync, including System following the OS', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const html = document.documentElement
    const lamp = screen.getByRole('button', { name: 'Lamplight (dark mode)' })
    // Behind an open modal the lamp is aria-hidden, so read it by attribute there.
    const lampPressed = () => document.querySelector('[aria-label="Lamplight (dark mode)"]')?.getAttribute('aria-pressed')

    async function openSettings() {
      await user.click(await screen.findByRole('button', { name: /^Account menu/ }))
      await user.click(await screen.findByRole('menuitem', { name: 'Settings…' }))
      const dialog = await screen.findByRole('dialog', { name: 'Settings' })
      return (name: string) => within(dialog).getByRole('radio', { name })
    }

    await user.click(lamp) // dark → light
    let radio = await openSettings()
    expect(radio('Light')).toBeChecked()

    await user.click(radio('System'))
    expect(html.dataset.theme).toBe('dark') // the OS is dark
    expect(lampPressed()).toBe('true')

    act(() => setMediaQuery('(prefers-color-scheme: light)', true)) // the OS turns light
    expect(html.dataset.theme).toBe('light')
    expect(lampPressed()).toBe('false')
    expect(radio('System')).toBeChecked()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(lamp) // flips what's on screen (light → dark), leaving System
    expect(html.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    radio = await openSettings()
    expect(radio('Dark')).toBeChecked()
    expect(radio('System')).not.toBeChecked()
  })

  it('menu closes on Escape and on link click', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const menuButton = screen.getByRole('button', { name: 'Open menu' })

    await user.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton).toHaveFocus()

    await user.click(menuButton)
    await user.click(screen.getByRole('link', { name: 'Gallery' }))
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })
})
