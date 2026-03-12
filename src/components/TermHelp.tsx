import { useEffect, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { glossary, type GlossaryTermKey } from '../data/glossary'

interface TermHelpProps {
  termKey: GlossaryTermKey
}

export function TermHelp({ termKey }: TermHelpProps) {
  const term = glossary[termKey]
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDetailsElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) {
      return
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (!rootRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const updatePosition = () => {
      const trigger = triggerRef.current
      const card = cardRef.current
      if (!trigger || !card) {
        return
      }
      const triggerRect = trigger.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const maxLeft = viewportWidth - cardRect.width - 12
      const maxTop = viewportHeight - cardRect.height - 12
      const left = Math.max(12, Math.min(maxLeft, triggerRect.right - cardRect.width))
      const top = Math.max(12, Math.min(maxTop, triggerRect.bottom + 8))
      setCardPosition({ top, left })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    document.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <details ref={rootRef} className="term-help" open={open}>
      <summary
        ref={triggerRef}
        aria-label={`${term.title} 解释`}
        onClick={(event) => {
          event.preventDefault()
          setOpen((current) => !current)
        }}
      >
        <CircleHelp size={13} />
      </summary>
      <div
        ref={cardRef}
        className="term-help-card"
        style={{
          position: 'fixed',
          left: `${cardPosition.left}px`,
          top: `${cardPosition.top}px`,
          zIndex: 2000,
        }}
      >
        <strong>{term.title}</strong>
        <p>{term.explanation}</p>
        <p>常见场景：{term.usage}</p>
      </div>
    </details>
  )
}
