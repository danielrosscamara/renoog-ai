// Toasts: appear, dismiss by button, auto dismiss after 5s, max 3, error role.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from './Toast'
import { MAX_TOASTS, TOAST_DURATION_MS, toast } from './toastStore'

afterEach(() => {
  act(() => toast.clear())
  vi.useRealTimers()
})

describe('Toaster', () => {
  it('shows a toast and removes it with the dismiss button', () => {
    render(<Toaster />)
    act(() => {
      toast.success('Saved')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Saved')

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('auto dismisses after 5 seconds', () => {
    vi.useFakeTimers()
    render(<Toaster />)
    act(() => {
      toast.info('Heads up')
    })
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(screen.getByText('Heads up')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Heads up')).not.toBeInTheDocument()
  })

  it('keeps at most 3, dropping the oldest', () => {
    render(<Toaster />)
    act(() => {
      ;['one', 'two', 'three', 'four'].forEach((m) => toast.info(m))
    })
    expect(screen.getAllByRole('status')).toHaveLength(MAX_TOASTS)
    expect(screen.queryByText('one')).not.toBeInTheDocument()
    expect(screen.getByText('four')).toBeInTheDocument()
  })

  it('uses role="alert" for errors', () => {
    render(<Toaster />)
    act(() => {
      toast.error('Failed')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Failed')
  })
})
