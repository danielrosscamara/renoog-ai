// "Featured characters" row on Home (GET /characters/featured).
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Button, ButtonLink } from '@/components/Button'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { CharacterCard, featuredCharactersQuery } from '@/features/characters'
import { paths } from '@/lib/paths'
import styles from './HomeView.module.css'

export function FeaturedRow() {
  const featured = useQuery(featuredCharactersQuery)

  return (
    <section aria-labelledby="featured-heading" className={styles.section}>
      <SectionHeader
        id="featured-heading"
        eyebrow="Characters are the heart of it"
        title="Featured characters"
        action={<ButtonLink to={paths.gallery} variant="ghost" size="sm">Browse Gallery</ButtonLink>}
      />

      {featured.isPending ? (
        <ul className={styles.featured} aria-label="Loading featured characters">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <Skeleton className={styles.tileSkeleton} />
            </li>
          ))}
        </ul>
      ) : featured.isError ? (
        <StateMessage
          role="alert"
          title="Couldn’t load featured characters"
          body="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => void featured.refetch()}>Try again</Button>}
        />
      ) : featured.data.length === 0 ? (
        <StateMessage
          icon={Users}
          title="Nothing featured right now"
          body="The Gallery has every character to choose from."
        />
      ) : (
        <ul className={styles.featured}>
          {featured.data.map((character) => (
            <li key={character.id}>
              <CharacterCard character={character} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
