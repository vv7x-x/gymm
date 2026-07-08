import { Button } from '@heroui/react'
import Dialog from './Dialog'

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

export default function ConfirmModal({
  open, title, message,
  confirmLabel = 'Delete', cancelLabel = 'Cancel',
  loading, variant = 'danger',
  onConfirm, onCancel,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onClose={onCancel} size="sm">
      <div className="flex flex-col items-center text-center px-6 pt-8 pb-2">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: variant === 'danger' ? 'var(--bg-danger)' : 'var(--bg-info)' }}
        >
          <i
            className={`bi ${variant === 'danger' ? 'bi-exclamation-triangle' : 'bi-question-circle'} text-xl`}
            style={{ color: variant === 'danger' ? 'var(--danger)' : 'var(--info)' }}
          />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-sm mt-1.5 max-w-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-4 border-t border-[var(--border)]">
        <Button
          variant="ghost"
          className="h-11 font-medium px-5"
          onPress={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          className="h-11 font-medium px-5"
          isPending={loading}
          onPress={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
