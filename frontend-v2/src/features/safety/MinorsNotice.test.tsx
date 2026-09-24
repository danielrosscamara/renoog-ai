// MinorsNotice: the wording is fixed and must match exactly.
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MinorsNotice } from './MinorsNotice'

describe('MinorsNotice', () => {
  it('shows the exact wording', () => {
    render(<MinorsNotice />)
    expect(screen.getByText('May not be suitable for some minors.')).toBeInTheDocument()
  })
})
