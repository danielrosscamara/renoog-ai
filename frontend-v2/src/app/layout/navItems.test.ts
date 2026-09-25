// navItems: the four main links, in order, with the right match mode.
import { describe, expect, it } from 'vitest'
import { paths } from '../../lib/paths'
import { navItems } from './navItems'

describe('navItems', () => {
  it('is Home, Gallery, Chat Room, My Stories', () => {
    expect(navItems).toEqual([
      { label: 'Home', to: paths.home, end: true },
      { label: 'Gallery', to: paths.gallery, end: false },
      { label: 'Chat Room', to: '/chat', end: false },
      { label: 'My Stories', to: paths.stories, end: false },
    ])
  })
})
