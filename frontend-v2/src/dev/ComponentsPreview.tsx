// Dev only preview at /dev/components: every shared component in every variant,
// for checking by eye in both themes (flip the lamp in the navbar).
// The router registers this page only when import.meta.env.DEV is true.
import { ArrowRight, Inbox, House, Plus, Sparkles, Trash2 } from 'lucide-react'
import sampleArt from '../features/home/hero.png'
import { Button, ButtonLink, IconButton, IconLink, type ButtonSize, type ButtonVariant } from '../components/Button'
import { Chip } from '../components/Chip'
import { PageHeader } from '../components/PageHeader'
import { Avatar, Portrait } from '../components/Portrait'
import { SectionHeader } from '../components/SectionHeader'
import { Skeleton } from '../components/Skeleton'
import { StateMessage } from '../components/StateMessage'
import { toast } from '../components/toastStore'
import { MinorsNotice } from '../features/safety'
import { useDocumentTitle } from '../lib/hooks/useDocumentTitle'
import { paths } from '../lib/paths'
import styles from './ComponentsPreview.module.css'

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost']
const SIZES: ButtonSize[] = ['sm', 'md', 'lg']

export function ComponentsPreview() {
  useDocumentTitle('Components')

  return (
    <div className={`container ${styles.page}`}>
      <PageHeader
        eyebrow="Dev only"
        title="Components"
        lead="Every shared component in every variant. Flip the lamp in the navbar to check both themes."
        action={<ButtonLink to={paths.home} variant="outline">Back home</ButtonLink>}
      />

      <section aria-labelledby="buttons" className={styles.section}>
        <SectionHeader id="buttons" eyebrow="Button" title="Buttons" />
        {SIZES.map((size) => (
          <div key={size} className={styles.row}>
            <span className={styles.label}>{size}</span>
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
          </div>
        ))}
        <div className={styles.row}>
          <span className={styles.label}>icons</span>
          <Button leadingIcon={<Plus size={18} />}>Leading</Button>
          <Button variant="secondary" trailingIcon={<ArrowRight size={18} />}>Trailing</Button>
          <ButtonLink to={paths.gallery} variant="outline" trailingIcon={<ArrowRight size={18} />}>
            ButtonLink
          </ButtonLink>
          <Button disabled>Disabled</Button>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>icon only</span>
          {VARIANTS.map((variant) => (
            <IconButton key={variant} label={`${variant} icon button`} variant={variant}>
              <Sparkles size={20} />
            </IconButton>
          ))}
          {SIZES.map((size) => (
            <IconButton key={size} label={`${size} icon button`} size={size} variant="secondary">
              <Trash2 size={size === 'sm' ? 16 : 20} />
            </IconButton>
          ))}
          <IconLink to={paths.home} label="Home (IconLink)">
            <House size={20} />
          </IconLink>
        </div>
        <div className={styles.narrow}>
          <Button block>Block button</Button>
        </div>
      </section>

      <section aria-labelledby="chips" className={styles.section}>
        <SectionHeader id="chips" eyebrow="Chip" title="Chips" />
        <div className={styles.row}>
          <Chip>Tag</Chip>
          <Chip dot>Tag with dot</Chip>
          <Chip variant="badge">Badge</Chip>
          <Chip variant="badge" dot>Narrator</Chip>
        </div>
        <div className={styles.artStrip}>
          <Portrait name="Ada" fallback="overlay" />
          <div className={styles.artChips}>
            <Chip variant="image">On image</Chip>
            <Chip variant="image" dot>Online</Chip>
          </div>
        </div>
      </section>

      <section aria-labelledby="portraits" className={styles.section}>
        <SectionHeader id="portraits" eyebrow="Portrait" title="Portraits and avatars" />
        <div className={styles.row}>
          <figure className={styles.figure}>
            <div className={styles.frame}><Portrait name="Mira" src={sampleArt} /></div>
            <figcaption>image</figcaption>
          </figure>
          <figure className={styles.figure}>
            <div className={styles.frame}><Portrait name="Professor Ada" /></div>
            <figcaption>no image</figcaption>
          </figure>
          <figure className={styles.figure}>
            <div className={styles.frame}><Portrait name="The Wanderer" src="/missing.png" /></div>
            <figcaption>broken image</figcaption>
          </figure>
          <figure className={styles.figure}>
            <div className={styles.frame}><Portrait name="Lady Kestrel" fallback="overlay" /></div>
            <figcaption>overlay</figcaption>
          </figure>
        </div>
        <div className={styles.row}>
          <Avatar name="Mira" src={sampleArt} size={24} />
          <Avatar name="Mira" src={sampleArt} size={32} />
          <Avatar name="Ada" size={40} />
          <Avatar name="The Wanderer" size={48} />
          <Avatar name="Kestrel" size={64} fallback="overlay" />
        </div>
      </section>

      <section aria-labelledby="headers" className={styles.section}>
        <SectionHeader
          id="headers"
          eyebrow="SectionHeader"
          title="Section header with action"
          action={<Button variant="ghost" size="sm" trailingIcon={<ArrowRight size={16} />}>See all</Button>}
        />
        <div className={styles.box}>
          <PageHeader
            eyebrow="PageHeader"
            title="Page title"
            lead="A lead paragraph that explains the page in a sentence or two."
            action={<Button leadingIcon={<Plus size={18} />}>Action</Button>}
          />
        </div>
      </section>

      <section aria-labelledby="skeletons" className={styles.section}>
        <SectionHeader id="skeletons" eyebrow="Skeleton" title="Skeletons" />
        <div className={styles.row}>
          <Skeleton round width={48} height={48} />
          <div className={styles.stack}>
            <Skeleton width={220} height={16} />
            <Skeleton width={160} height={12} />
          </div>
          <Skeleton width={120} height={160} />
        </div>
      </section>

      <section aria-labelledby="states" className={styles.section}>
        <SectionHeader id="states" eyebrow="StateMessage" title="State messages" />
        <div className={styles.grid}>
          <StateMessage
            icon={Inbox}
            title="No stories yet"
            body="Start a chat from any character card and it will show up here."
            action={<ButtonLink to={paths.gallery}>Browse the gallery</ButtonLink>}
          />
          <StateMessage
            role="alert"
            icon={Sparkles}
            title="Couldn't load characters"
            body="Check your connection and try again."
            action={<Button variant="outline">Try again</Button>}
          />
        </div>
      </section>

      <section aria-labelledby="toasts" className={styles.section}>
        <SectionHeader id="toasts" eyebrow="Toast" title="Toasts" />
        <div className={styles.row}>
          <Button variant="secondary" onClick={() => toast.info('Heads up: this is an info toast.')}>Info</Button>
          <Button variant="secondary" onClick={() => toast.success('Saved your character.')}>Success</Button>
          <Button variant="secondary" onClick={() => toast.error('Something went wrong. Try again.')}>Error</Button>
          <Button variant="ghost" onClick={() => toast.clear()}>Clear all</Button>
        </div>
      </section>

      <section aria-labelledby="safety" className={styles.section}>
        <SectionHeader id="safety" eyebrow="Safety" title="Minors notice" />
        <MinorsNotice />
      </section>
    </div>
  )
}
