/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useI18n } from './I18nContext'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { dir } = useI18n()
  const isRtl = dir === 'rtl'

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      const el = document.getElementById(`toast-${id}`)
      if (el) { el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; el.style.transition = 'all 0.3s ease' }
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={`fixed bottom-6 z-[100] flex flex-col gap-2 ${isRtl ? 'left-6' : 'right-6'}`}>
        {toasts.map(t => (
          <div key={t.id} id={`toast-${t.id}`}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg animate-slide-right"
            style={{
              background: t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : 'var(--primary)',
              minWidth: 200,
              boxShadow: t.type === 'success' ? '0 4px 20px rgba(34,197,94,0.3)' : t.type === 'error' ? '0 4px 20px rgba(239,68,68,0.3)' : '0 4px 20px rgba(79,124,255,0.3)',
            }}>
            <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
