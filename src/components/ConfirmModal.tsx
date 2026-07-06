import { Button } from '@heroui/react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', loading, variant = 'danger', onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: 'var(--bg-modal-overlay)' }} />
      <div className="relative rounded-2xl border p-6 w-full max-w-sm animate-scale-in shadow-xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
          style={{ background: variant === 'danger' ? 'var(--bg-danger)' : 'var(--bg-info)' }}>
          <i className={`bi ${variant === 'danger' ? 'bi-exclamation-triangle' : 'bi-question-circle'} text-xl`}
            style={{ color: variant === 'danger' ? 'var(--danger)' : 'var(--info)' }} />
        </div>
        <h3 className="text-lg font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onPress={onCancel}>{cancelLabel}</Button>
          <Button variant={variant} fullWidth isPending={loading} onPress={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
