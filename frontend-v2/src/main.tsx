// Entry point: loads global styles, starts the MSW fake backend in dev, and mounts the app.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import App from './app/App'

/** Starts MSW only in dev with VITE_USE_MOCKS=true, so production never ships the mocks. */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element in index.html')

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
