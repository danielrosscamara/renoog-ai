// Page frame for every route: skip link, navbar, the routed page in <main>,
// footer, and the single <Toaster /> for the whole app.
import { Outlet, ScrollRestoration } from 'react-router'
import { Toaster } from '../../components/Toast'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      <Toaster />
      <ScrollRestoration />
    </div>
  )
}
