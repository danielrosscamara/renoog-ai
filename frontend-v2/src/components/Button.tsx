// Buttons and button styled links. Button and ButtonLink carry text with optional
// icons; IconButton and IconLink are icon only and require a `label`, which
// becomes both the aria-label and the tooltip title.
import type { ComponentProps, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '../lib/cn'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Look = {
  variant?: ButtonVariant
  size?: ButtonSize
}

type TextLook = Look & {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  /** Stretch to the full width of the container. */
  block?: boolean
}

type IconOnly = Look & {
  /** Accessible name and tooltip. Required because there is no visible text. */
  label: string
  children: ReactNode
}

function textClass({ variant = 'primary', size = 'md', block }: TextLook, className?: string) {
  return cn(styles.button, styles[variant], styles[size], block && styles.block, className)
}

function iconClass({ variant = 'ghost', size = 'md' }: Look, className?: string) {
  return cn(styles.button, styles.iconOnly, styles[variant], styles[size], className)
}

function Content({ leadingIcon, trailingIcon, children }: { leadingIcon?: ReactNode; trailingIcon?: ReactNode; children: ReactNode }) {
  return (
    <>
      {leadingIcon && <span className={styles.icon} aria-hidden="true">{leadingIcon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className={styles.icon} aria-hidden="true">{trailingIcon}</span>}
    </>
  )
}

type ButtonProps = ComponentProps<'button'> & TextLook

export function Button({ variant, size, block, leadingIcon, trailingIcon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={textClass({ variant, size, block }, className)} {...rest}>
      <Content leadingIcon={leadingIcon} trailingIcon={trailingIcon}>{children}</Content>
    </button>
  )
}

type ButtonLinkProps = LinkProps & TextLook

export function ButtonLink({ variant, size, block, leadingIcon, trailingIcon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={textClass({ variant, size, block }, className)} {...rest}>
      <Content leadingIcon={leadingIcon} trailingIcon={trailingIcon}>{children}</Content>
    </Link>
  )
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label' | 'title' | 'children'> & IconOnly

export function IconButton({ label, variant, size, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={iconClass({ variant, size }, className)} {...rest}>
      <span className={styles.icon} aria-hidden="true">{children}</span>
    </button>
  )
}

type IconLinkProps = Omit<LinkProps, 'aria-label' | 'title' | 'children'> & IconOnly

export function IconLink({ label, variant, size, className, children, ...rest }: IconLinkProps) {
  return (
    <Link aria-label={label} title={label} className={iconClass({ variant, size }, className)} {...rest}>
      <span className={styles.icon} aria-hidden="true">{children}</span>
    </Link>
  )
}
