// Settings dialog: layout (tabs vs list), theme incl. System and the lamp
// staying in sync, chat text size, server settings (optimistic PATCH,
// rollback, list failures, model notice), delete all chats, and About.
import type { ReactNode } from 'react'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/Toast'
import { toast } from '@/components/toastStore'
import { ChatListView } from '@/features/chat'
import { CRISIS_SUPPORT_TEXT } from '@/features/safety'
import { apiUrl } from '@/lib/api'
import { server } from '@/mocks/server'
import { setMediaQuery } from '@/test/matchMedia'
import { renderRoute } from '@/test/render'
import { SettingsDialog } from './SettingsDialog'

const LIGHT_OS = '(prefers-color-scheme: light)'
const DESKTOP = '(min-width: 640px)'
const failure = (status = 500) => HttpResponse.json({ code: 'internal_error', message: 'x' }, { status })

/**
 * Renders the dialog open. Anything passed as `extra` sits behind the modal,
 * like the real page: hidden from assistive tech (so it's found by text or with
 * { hidden: true }) and under pointer-events: none (hence pointerEventsCheck: 0).
 */
function renderSettings(extra?: ReactNode) {
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  const result = renderRoute(
    <>
      <SettingsDialog open onOpenChange={() => {}} />
      <Toaster />
      {extra}
    </>,
  )
  const dialog = screen.getByRole('dialog', { name: 'Settings' })
  return { user, dialog, ...result }
}

const section = (dialog: HTMLElement, name: string) => within(dialog).getByRole('region', { name })

afterEach(() => {
  act(() => toast.clear())
})

describe('SettingsDialog layout', () => {
  it('shows one list with a heading per section on phones', () => {
    const { dialog } = renderSettings()

    expect(within(dialog).queryByRole('tablist')).not.toBeInTheDocument()
    for (const name of ['Appearance', 'Chat', 'Data', 'About']) {
      expect(within(dialog).getByRole('heading', { level: 3, name })).toBeInTheDocument()
    }
    expect(within(dialog).queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })

  it('shows section tabs on desktop', async () => {
    setMediaQuery(DESKTOP, true)
    const { user, dialog } = renderSettings()

    const tabs = within(dialog).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Appearance', 'Chat', 'Data', 'About'])
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('Theme')

    await user.click(within(dialog).getByRole('tab', { name: 'About' }))
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('Version')
  })
})

describe('Appearance', () => {
  it('System follows the OS live; an explicit choice ignores it', async () => {
    const { user, dialog } = renderSettings()
    const appearance = section(dialog, 'Appearance')
    const html = document.documentElement

    await user.click(within(appearance).getByRole('radio', { name: 'System' }))
    expect(html.dataset.theme).toBe('dark') // OS is dark
    expect(localStorage.getItem('renoog.theme')).toBe('system')

    act(() => setMediaQuery(LIGHT_OS, true)) // OS switches to light
    expect(html.dataset.theme).toBe('light')
    expect(within(appearance).getByRole('radio', { name: 'System' })).toBeChecked()

    await user.click(within(appearance).getByRole('radio', { name: 'Dark' }))
    act(() => setMediaQuery(LIGHT_OS, false))
    act(() => setMediaQuery(LIGHT_OS, true))
    expect(html.dataset.theme).toBe('dark')
  })

  it('chat text size sets --chat-font-size on <html>', async () => {
    const { user, dialog } = renderSettings()
    const appearance = section(dialog, 'Appearance')
    const size = () => document.documentElement.style.getPropertyValue('--chat-font-size')

    await user.click(within(appearance).getByRole('radio', { name: 'Large' }))
    expect(size()).toBe('18px')
    expect(localStorage.getItem('renoog.chatTextSize')).toBe('large')

    await user.click(within(appearance).getByRole('radio', { name: 'Small' }))
    expect(size()).toBe('15px')

    await user.click(within(appearance).getByRole('radio', { name: 'Medium' }))
    expect(size()).toBe('16px')
  })
})

describe('Chat', () => {
  it('saves Send with in the browser', async () => {
    const { user, dialog } = renderSettings()

    await user.click(within(section(dialog, 'Chat')).getByRole('radio', { name: 'Ctrl+Enter' }))
    expect(localStorage.getItem('renoog.sendWith')).toBe('ctrl-enter')
  })

  it('loads server settings and saves a change with a partial PATCH', async () => {
    let body: unknown
    server.use(
      http.patch(apiUrl('/settings'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ defaultPresetId: 'default', modelId: 'llama3.1:8b', responseLength: 'long', modelNotice: null })
      }),
    )
    const { user, dialog } = renderSettings()
    const chat = section(dialog, 'Chat')

    expect(await within(chat).findByRole('combobox', { name: 'Default style' })).toHaveValue('default')
    await waitFor(() => expect(within(chat).getByRole('combobox', { name: 'Model' })).toBeEnabled())
    expect(within(chat).getByRole('combobox', { name: 'Model' })).toHaveValue('llama3.1:8b')
    expect(within(chat).getByRole('radio', { name: 'Medium' })).toBeChecked()

    await user.click(within(chat).getByRole('radio', { name: 'Long' }))
    expect(within(chat).getByRole('radio', { name: 'Long' })).toBeChecked()
    await waitFor(() => expect(body).toEqual({ responseLength: 'long' }))
  })

  it('rolls the select back and shows a toast when the PATCH fails', async () => {
    let release!: () => void
    const answered = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.patch(apiUrl('/settings'), async () => {
        await answered
        return HttpResponse.json({ code: 'validation_error', message: 'x' }, { status: 422 })
      }),
    )
    const { user, dialog } = renderSettings()
    const chat = section(dialog, 'Chat')
    const model = await within(chat).findByRole('combobox', { name: 'Model' })
    await waitFor(() => expect(model).toBeEnabled())

    await user.selectOptions(model, 'mistralai/mistral-nemo')
    expect(model).toHaveValue('mistralai/mistral-nemo') // optimistic

    release()
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t save that setting')
    expect(model).toHaveValue('llama3.1:8b')
  })

  it('shows the current model in a disabled select with Try again when /models fails', async () => {
    server.use(http.get(apiUrl('/models'), () => failure(), { once: true }))
    const { user, dialog } = renderSettings()
    const chat = section(dialog, 'Chat')

    const retry = await within(chat).findByRole('button', { name: 'Try again' })
    const model = within(chat).getByRole('combobox', { name: 'Model' })
    expect(model).toBeDisabled()
    expect(model).toHaveValue('llama3.1:8b')
    expect(within(chat).getByText('Couldn’t load the choices.')).toBeInTheDocument()
    expect(within(chat).getByRole('combobox', { name: 'Default style' })).toBeEnabled()

    await user.click(retry)
    await waitFor(() => expect(model).toBeEnabled())
    expect(within(chat).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(within(model).getByRole('option', { name: 'Mistral Nemo' })).toBeInTheDocument()
  })

  it('shows the model notice as a neutral note above Model', async () => {
    server.use(
      http.get(apiUrl('/settings'), () =>
        HttpResponse.json({
          defaultPresetId: 'default',
          modelId: 'llama3.1:8b',
          responseLength: 'medium',
          modelNotice: 'Your model was retired; switched to Llama 3.1 8B.',
        }),
      ),
    )
    const { dialog } = renderSettings()
    const chat = section(dialog, 'Chat')

    const note = await within(chat).findByRole('note')
    expect(note).toHaveTextContent('Your model was retired; switched to Llama 3.1 8B.')
    const model = within(chat).getByRole('combobox', { name: 'Model' })
    expect(note.compareDocumentPosition(model) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Data', () => {
  it('only enables Delete once DELETE is typed; success clears the story list', async () => {
    const { user, dialog } = renderSettings(<ChatListView />)
    expect(await screen.findByRole('link', { name: 'Rowan of the Hearth', hidden: true })).toBeInTheDocument()

    await user.click(within(section(dialog, 'Data')).getByRole('button', { name: 'Delete all chats…' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete all chats?' })
    const button = within(confirm).getByRole('button', { name: 'Delete all chats' })
    const input = within(confirm).getByRole('textbox', { name: 'Type DELETE to confirm' })
    expect(button).toBeDisabled()

    await user.type(input, 'delete')
    expect(button).toBeDisabled()
    await user.clear(input)
    await user.type(input, 'DELETE')
    expect(button).toBeEnabled()

    await user.click(button)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete all chats?' })).not.toBeInTheDocument())
    expect(await screen.findByRole('status')).toHaveTextContent('All chats deleted.')
    expect(await screen.findByText('No stories yet')).toBeInTheDocument()
  })

  it('keeps the confirm open and explains when deleting fails', async () => {
    server.use(http.delete(apiUrl('/chats'), () => failure()))
    const { user, dialog } = renderSettings()

    await user.click(within(section(dialog, 'Data')).getByRole('button', { name: 'Delete all chats…' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete all chats?' })
    await user.type(within(confirm).getByRole('textbox'), 'DELETE')
    await user.click(within(confirm).getByRole('button', { name: 'Delete all chats' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t delete your chats')
    expect(screen.getByRole('dialog', { name: 'Delete all chats?' })).toBeInTheDocument()
  })
})

describe('About', () => {
  it('shows the app version and the safety and support text', () => {
    const { dialog } = renderSettings()
    const about = section(dialog, 'About')

    expect(about).toHaveTextContent(`Version${import.meta.env.VITE_APP_VERSION}`)
    expect(import.meta.env.VITE_APP_VERSION).toMatch(/^\d+\.\d+\.\d+/)
    expect(within(about).getByText(CRISIS_SUPPORT_TEXT)).toBeInTheDocument()
  })
})
