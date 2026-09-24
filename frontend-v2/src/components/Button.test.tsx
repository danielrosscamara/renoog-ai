// Button family: the right element for each, and icon only labels.
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Button, ButtonLink, IconButton } from './Button'

describe('Button', () => {
  it('Button renders a real button, type="button" by default', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('ButtonLink renders a link to the target', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/gallery">Browse</ButtonLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/gallery')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('IconButton uses its label as aria-label and title', () => {
    render(<IconButton label="Delete">x</IconButton>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveAttribute('title', 'Delete')
  })
})
