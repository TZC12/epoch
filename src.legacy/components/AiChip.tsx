import { memo } from 'react'

interface AiChipProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export const AiChip = memo(function AiChip({ children, onClick, className = '' }: AiChipProps) {
  return (
    <button type="button" className={`ai-chip ${className}`} onClick={onClick}>
      <span className="ai-chip-text">{children}</span>
      <span className="ai-chip-action" aria-hidden>
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v12M2 8h12" />
        </svg>
      </span>
    </button>
  )
})
