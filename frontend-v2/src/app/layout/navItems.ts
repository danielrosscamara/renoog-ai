// Main navigation links. Chat Room opens the chat layout, which jumps to your
// latest story, and stays active on every /chat/:chatId page (end: false).
import { paths } from '../../lib/paths'

export type NavItem = {
  label: string
  to: string
  /** true: active only on an exact match. false: also active on nested paths. */
  end: boolean
}

export const navItems: readonly NavItem[] = [
  { label: 'Home', to: paths.home, end: true },
  { label: 'Gallery', to: paths.gallery, end: false },
  { label: 'Chat Room', to: paths.chatHome, end: false },
  { label: 'My Stories', to: paths.stories, end: false },
]
