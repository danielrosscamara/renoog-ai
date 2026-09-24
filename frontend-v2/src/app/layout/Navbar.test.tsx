// Navbar: exact main links, the lamp toggle (data-theme, aria-pressed, storage)
// and the mobile menu closing behaviour.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '../../features/settings'
import { Navbar } from './Navbar'

function renderNavbar() {
  const router = createMemoryRouter([{ path: '*', Component: Navbar }], { initialEntries: ['/'] })
  return render(<RouterProvider router={router} />)
}

describe('Navbar', () => {
  it('has exactly Home, Gallery and My Stories', () => {
    renderNavbar()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const labels = within(nav).getAllByRole('link').map((link) => link.textContent)
    expect(labels).toEqual(['Home', 'Gallery', 'My Stories'])
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
