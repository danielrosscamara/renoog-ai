// Character art. Portrait fills its container with a lazy loaded image and falls
// back to a monogram when there is no image or it fails to load.
// fallback="overlay" keeps a dark backdrop in both themes, for text laid over it.
// Avatar is a circular Portrait at a fixed pixel size.
import { useState, type CSSProperties } from 'react'
import { cn } from '../lib/cn'
import { monogram } from '../lib/monogram'
import styles from './Portrait.module.css'

type PortraitProps = {
  name: string
  src?: string | null
  fallback?: 'default' | 'overlay'
  className?: string
}

export function Portrait({ name, src, fallback = 'default', className }: PortraitProps) {
  // Remember which src failed, so a new src gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && src !== failedSrc

  return (
    <div className={cn(styles.portrait, fallback === 'overlay' && styles.overlay, className)}>
      {showImage ? (
        <img
          className={styles.image}
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src!)}
        />
      ) : (
        <span className={styles.monogram} aria-hidden="true">
          {monogram(name)}
        </span>
      )}
    </div>
  )
}

type AvatarProps = PortraitProps & {
  /** Diameter in pixels. */
  size?: number
}

export function Avatar({ size = 40, className, ...rest }: AvatarProps) {
  return (
    <div className={cn(styles.avatar, className)} style={{ '--avatar-size': `${size}px` } as CSSProperties}>
      <Portrait {...rest} />
    </div>
  )
}
