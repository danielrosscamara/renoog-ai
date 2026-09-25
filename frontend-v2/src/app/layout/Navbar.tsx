// Sticky top bar: logo, main links, lamp theme toggle and the account menu.
// The lamp is ON in dark mode (Lamplight) and OFF in light mode.
// Under 768px the links collapse behind a menu button (closes on link click or Escape).
import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Lamp, LampDesk, Menu, X } from 'lucide-react'
import { IconButton } from '../../components/Button'
import { useSettingsStore } from '../../features/settings'
import { cn } from '../../lib/cn'
import { paths } from '../../lib/paths'
import { AccountMenu } from './AccountMenu'
import { navItems } from './navItems'
import styles from './Navbar.module.css'

export function Navbar() {
  const { theme, toggleTheme } = useSettingsStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const isDark = theme === 'dark'

  return (
    <header className={styles.header}>
      <div className={cn('container', styles.inner)}>
        <Link to={paths.home} className={styles.logo}>
          <LampDesk aria-hidden="true" size={22} className={styles.logoIcon} />
          <span>renoog.ai</span>
        </Link>

        <nav aria-label="Main" className={styles.nav}>
          <ul id={menuId} className={cn(styles.links, menuOpen && styles.linksOpen)}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(styles.link, isActive && styles.active)}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <IconButton
            label="Lamplight (dark mode)"
            aria-pressed={isDark}
            className={cn(styles.lamp, isDark && styles.lampOn)}
            onClick={toggleTheme}
          >
            <Lamp size={20} />
          </IconButton>
          <AccountMenu />
          <IconButton
            ref={menuButtonRef}
            className={styles.menuButton}
            label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </IconButton>
        </div>
      </div>
    </header>
  )
}
