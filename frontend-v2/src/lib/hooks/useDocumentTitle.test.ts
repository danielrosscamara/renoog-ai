// Tab titles: "<Page> · Renoog AI", home is just "Renoog AI".
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

describe('useDocumentTitle', () => {
  it('formats page titles', () => {
    renderHook(() => useDocumentTitle('Gallery'))
    expect(document.title).toBe('Gallery · Renoog AI')
  })

  it('uses just the app name with no page', () => {
    renderHook(() => useDocumentTitle())
    expect(document.title).toBe('Renoog AI')
  })
})
