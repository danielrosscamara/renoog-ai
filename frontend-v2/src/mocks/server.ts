import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Node-side MSW server for Vitest. Override per test with server.use(...). */
export const server = setupServer(...handlers)
