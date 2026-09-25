import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { readdirSync } from 'node:fs'

// Import boundaries: app → features → components/lib, never upward.
// Relative forms are caught too, e.g. '../../app/router' or '../chat/queries'.
const noApp = {
  regex: '^(@/|(\\.\\./)+)app(/|$)',
  message: 'Only src/app may import from src/app.',
}
const noFeatures = {
  regex: '^(@/|(\\.\\./)+)features(/|$)',
  message: 'components and lib are shared; they must not depend on a feature.',
}

/** One block per feature, so a feature may reach its own internals but only another feature's index. */
const features = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const featureBoundaries = features.map((name) => {
  const others = features.filter((other) => other !== name).join('|')
  return {
    files: [`src/features/${name}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          noApp,
          {
            regex: `^(@/features/|(\\.\\./)+)(${others})/.+`,
            message: "Import another feature only through its index, e.g. '@/features/chat'.",
          },
        ],
      }],
    },
  }
})

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  ...featureBoundaries,
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noApp, noFeatures] }],
    },
  },
])
