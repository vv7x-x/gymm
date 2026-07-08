import { useEffect, type ReactNode, type MouseEvent } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[700px]',
}

export default function Dialog({ open, onClose, children, size = 'sm', className = '' }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleOverlay = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[9998]"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={handleOverlay}
    >
      <div className="fixed inset-0 backdrop-blur-[8px]" onClick={onClose} />
      <div
        className={`relative z-[9999] w-full ${sizeMap[size]} max-h-[95vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.2)] animate-slide-up ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
