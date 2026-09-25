// Banner inviting you to make your own companion (links to /characters/new).
import { Sparkles } from 'lucide-react'
import { ButtonLink } from '@/components/Button'
import { paths } from '@/lib/paths'
import hero from './hero.png'
import styles from './HomeView.module.css'

export function ForgeBanner() {
  return (
    <section aria-labelledby="forge-heading" className={styles.banner}>
      <div className={styles.bannerText}>
        <h2 id="forge-heading" className={styles.bannerTitle}>Make your own companion</h2>
        <p className={styles.bannerBody}>
          Give them a name, a voice and a place by the fire. Or import a character card you already love.
        </p>
        <ButtonLink to={paths.newCharacter} leadingIcon={<Sparkles size={18} />}>
          Create companion
        </ButtonLink>
      </div>
      <img src={hero} alt="" className={styles.bannerArt} width={343} height={361} loading="lazy" decoding="async" />
    </section>
  )
}
