// Loading placeholder: a pulsing block, hidden from screen readers. Size it with
// className or the width/height props. No pulse with prefers-reduced-motion.
import type { CSSProperties } from 'react'
import { cn } from '../lib/cn'
import styles from './Skeleton.module.css'

type SkeletonProps = {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  round?: boolean
  className?: string
}

export function Skeleton({ width, height, round = false, className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(styles.skeleton, round && styles.round, className)}
      style={{ width, height }}
    />
  )
}
