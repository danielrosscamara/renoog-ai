// Portrait: image when it loads, monogram when it is missing or fails.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Portrait } from './Portrait'

describe('Portrait', () => {
  it('shows a lazy image with empty alt when src is given', () => {
    const { container } = render(<Portrait name="Mira" src="/mira.png" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('falls back to the monogram when the image fails to load', () => {
    const { container } = render(<Portrait name="Professor Ada" src="/broken.png" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('skips titles and articles for the monogram', () => {
    render(<Portrait name="The Wanderer" />)
    expect(screen.getByText('W')).toBeInTheDocument()
  })
})
