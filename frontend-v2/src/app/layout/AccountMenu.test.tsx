// Account menu: persona trigger and its states, the persona switcher
// (optimistic switch, rollback + toast on failure), the Settings dialog,
// Log out behind VITE_AUTH_ENABLED, and keyboard close with focus return.
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/Toast'
import { toast } from '@/components/toastStore'
import { apiUrl } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { server } from '@/mocks/server'
import { renderRoute } from '@/test/render'
import { AccountMenu } from './AccountMenu'

const renderMenu = () =>
  renderRoute(
    <>
      <AccountMenu />
      <Toaster />
    </>,
  )

async function openMenu(name = 'Account menu, chatting as Ren') {
  const user = userEvent.setup()
  const trigger = await screen.findByRole('button', { name })
  trigger.focus()
  await user.keyboard('{Enter}')
  const menu = await screen.findByRole('menu')
  return { user, trigger, menu }
}

const personaRows = () => screen.getAllByRole('menuitemradio')

afterEach(() => {
  act(() => toast.clear())
  document.documentElement.removeAttribute('data-theme')
})

describe('AccountMenu trigger', () => {
  it('shows the persona picture with a label naming the persona', async () => {
    server.use(
      http.get(apiUrl('/personas/active'), () =>
        HttpResponse.json({ id: 'mira', name: 'Mira', avatarUrl: 'https://img.example/mira.png' }),
      ),
    )
    renderMenu()

    const trigger = await screen.findByRole('button', { name: 'Account menu, chatting as Mira' })
    expect(trigger.querySelector('img')).toHaveAttribute('src', 'https://img.example/mira.png')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('shows a monogram when the persona has no picture', async () => {
    renderMenu()

    const trigger = await screen.findByRole('button', { name: 'Account menu, chatting as Ren' })
    expect(trigger.querySelector('img')).toBeNull()
    expect(trigger).toHaveTextContent('R')
  })

  it('falls back to "Account menu" and the user icon when the persona fails to load', async () => {
    server.use(http.get(apiUrl('/personas/active'), () => HttpResponse.json({ code: 'internal_error', message: 'x' }, { status: 500 })))
    renderMenu()

    const trigger = screen.getByRole('button', { name: 'Account menu' })
    await waitFor(() => expect(trigger.querySelector('svg.lucide-user-round')).not.toBeNull())
  })
})

describe('PersonaSwitcher', () => {
  it('lists every persona, sorted by name, under "Chatting as", and checks the active one', async () => {
    renderMenu()
    const { menu } = await openMenu()

    expect(within(menu).getByText('Chatting as')).toBeInTheDocument()
    await waitFor(() => expect(personaRows()).toHaveLength(4))
    ;['Kael', 'Mira', 'Ren', 'Sol'].forEach((name, i) => expect(personaRows()[i]).toHaveTextContent(name))
    expect(screen.getByRole('menuitemradio', { name: /Ren/ })).toHaveAttribute('aria-checked', 'true')
    expect(personaRows().filter((row) => row.getAttribute('aria-checked') === 'true')).toHaveLength(1)
  })

  it('focuses the first persona when opened with the keyboard, and arrows reach every row', async () => {
    const user = userEvent.setup()
    const { client } = renderMenu()
    const trigger = await screen.findByRole('button', { name: 'Account menu, chatting as Ren' })
    // The list is prefetched with the trigger, so it's ready before the menu opens.
    await waitFor(() => expect(client.getQueryData(queryKeys.persona.list)).toHaveLength(4))

    trigger.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: /Kael/ })).toHaveFocus())

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemradio', { name: /Mira/ })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(trigger).toHaveAccessibleName('Account menu, chatting as Mira')
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('switches at once (before the server answers), keeps the menu open, then saves', async () => {
    let release!: () => void
    const answered = new Promise<void>((resolve) => (release = resolve))
    let sentBody: unknown
    server.use(
      http.put(apiUrl('/personas/active'), async ({ request }) => {
        sentBody = await request.json()
        await answered
        return HttpResponse.json({ id: 'mira', name: 'Mira', avatarUrl: 'https://img.example/mira.' })
      }),
    )
    renderMenu()
    const { user, trigger } = await openMenu()

    await user.click(await screen.findByRole('menuitemradio', { name: /Mira/ }))

    // Optimistic: trigger and check mark change while the PUT is still pending.
    expect(trigger).toHaveAccessibleName('Account menu, chatting as Mira')
    expect(trigger.querySelector('img')).not.toBeNull()
    expect(screen.getByRole('menuitemradio', { name: /Mira/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: /Ren/ })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await waitFor(() => expect(sentBody).toEqual({ personaId: 'mira' }))
    release()
    await waitFor(() => expect(trigger).toHaveAccessibleName('Account menu, chatting as Mira'))
  })

  it('rolls back and shows a toast when the switch fails', async () => {
    server.use(http.put(apiUrl('/personas/active'), () => HttpResponse.json({ code: 'not_found', message: 'Not found.' }, { status: 404 })))
    renderMenu()
    const { user, trigger } = await openMenu()

    await user.click(await screen.findByRole('menuitemradio', { name: /Sol/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t switch to Sol')
    await waitFor(() => expect(trigger).toHaveAccessibleName('Account menu, chatting as Ren'))
    expect(screen.getByRole('menuitemradio', { name: /Ren/ })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('AccountMenu items', () => {
  it('has Settings… after the switcher, and no Log out while VITE_AUTH_ENABLED is unset', async () => {
    renderMenu()
    const { menu } = await openMenu()

    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Settings…'])
    expect(within(menu).queryByText('Log out')).not.toBeInTheDocument()
    expect(within(menu).queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders Log out after a separator when VITE_AUTH_ENABLED is "true"', async () => {
    vi.stubEnv('VITE_AUTH_ENABLED', 'true')
    vi.resetModules() // the flag is read once, when the module loads
    try {
      const { AccountMenu: WithAuth } = await import('./AccountMenu')
      renderRoute(<WithAuth />)
      const { menu } = await openMenu()

      expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Settings…', 'Log out'])
      expect(within(menu).getAllByRole('separator')).toHaveLength(2)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    renderMenu()
    const { user, trigger } = await openMenu()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

describe('Settings dialog', () => {
  it('opens from the menu, changes the theme at once, and closes with Esc back to the trigger', async () => {
    renderMenu()
    const { user, trigger } = await openMenu()

    await user.click(screen.getByRole('menuitem', { name: 'Settings…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Appearance' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: /Light/ }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(within(dialog).getByRole('radio', { name: /Light/ })).toBeChecked()

    await user.click(within(dialog).getByRole('radio', { name: /Dark/ }))
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('closes with its close button, returning focus to the trigger', async () => {
    renderMenu()
    const { user, trigger } = await openMenu()

    await user.click(screen.getByRole('menuitem', { name: 'Settings…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
