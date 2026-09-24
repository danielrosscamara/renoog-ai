// Main navigation links. No Chat link: a chat opens from a card.
import { paths } from '../../lib/paths'

export type NavItem = { label: string; to: string }

export const navItems: readonly NavItem[] = [
  { label: 'Home', to: paths.home },
  { label: 'Gallery', to: paths.gallery },
  { label: 'My Stories', to: paths.stories },
]
