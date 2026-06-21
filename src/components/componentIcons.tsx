import type { NodeKind } from '../types'
import { componentIconMeta } from './componentIconMeta'

interface ComponentLogoProps {
  kind: NodeKind
  size?: 'sm' | 'md' | 'lg'
}

export function ComponentLogo({ kind, size = 'md' }: ComponentLogoProps) {
  const meta = componentIconMeta[kind]
  const Icon = meta.Icon

  return (
    <span
      className={`component-logo component-logo--${meta.tone} component-logo--${size}`}
      aria-label={`${meta.label} logo`}
      title={meta.label}
    >
      <Icon aria-hidden="true" />
    </span>
  )
}
