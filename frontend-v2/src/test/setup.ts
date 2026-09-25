// Test setup: jest-dom matchers, the MSW fake backend, DOM cleanup and a fresh
// localStorage per test. Any request without a handler fails the test.
// matchMedia is faked (jsdom has none) before any app module reads it.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { installMatchMedia, resetMediaQueries } from './matchMedia'
import { resetDb } from '../mocks/data'
import { server } from '../mocks/server'

// Setup runs before any test file is loaded, so every module sees the fake.
installMatchMedia()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  localStorage.clear()
  server.resetHandlers()
  resetDb()
  resetMediaQueries()
})

afterAll(() => server.close())
