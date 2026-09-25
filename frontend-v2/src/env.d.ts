// Types for the VITE_* values the app reads (see .env.example).
interface ImportMetaEnv {
  /** Backend base URL, no trailing slash. */
  readonly VITE_API_URL?: string
  /** 'true' starts the MSW fake backend in dev. */
  readonly VITE_USE_MOCKS?: string
  /** 'true' shows Log out in the account menu (Phase 2). */
  readonly VITE_AUTH_ENABLED?: string
  /** package.json version, injected by vite.config.ts. */
  readonly VITE_APP_VERSION: string
}
