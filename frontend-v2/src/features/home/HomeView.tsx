// / (Home): a greeting by name, your stories to continue, featured
// characters, and an invitation to make your own companion.
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { recentChatsQuery } from '@/features/chat'
import { activePersonaQuery } from '@/features/personas'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'
import { ContinueShelf } from './ContinueShelf'
import { FeaturedRow } from './FeaturedRow'
import { ForgeBanner } from './ForgeBanner'
import { greeting } from './greeting'
import styles from './HomeView.module.css'

export function HomeView() {
  useDocumentTitle()
  const persona = useQuery(activePersonaQuery)
  // Same query (and cache) as ContinueShelf, so this adds no extra request.
  const inProgress = useQuery(recentChatsQuery).data?.length ?? 0
  const hello = greeting()

  return (
    <div className={cn('container', styles.page)}>
      {/* The name is plain text (untrusted, and there is no personas page).
          Without a persona (loading or failed) the greeting still reads naturally. */}
      <PageHeader
        eyebrow={inProgress > 0 && `${inProgress} ${inProgress === 1 ? 'story' : 'stories'} in progress`}
        title={persona.data ? `${hello}, ${persona.data.name}` : hello}
        lead="The lamp is lit and your storytellers are waiting. Pick up where you left off."
      />
      <ContinueShelf />
      <FeaturedRow />
      <ForgeBanner />
    </div>
  )
}
