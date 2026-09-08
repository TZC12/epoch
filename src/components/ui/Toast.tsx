import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './toast.css'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
  action?: ToastAction
}

interface ToastApi {
  toast: (message: string, opts?: { tone?: ToastTone; action?: ToastAction }) => void
}

const ToastCtx = createContext<ToastApi>({ toast: () => {} })

/** 全局 toast（3 变体 + 可选动作如“撤销”）。role=status aria-live=polite（继承旧版可达性）。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), [])

  const toast = useCallback<ToastApi['toast']>((message, opts = {}) => {
    const id = ++seq.current
    setItems((xs) => [...xs.slice(-2), { id, tone: opts.tone ?? 'info', message, action: opts.action }])
    window.setTimeout(() => dismiss(id), opts.action ? 4200 : 2600)
  }, [dismiss])

  const api = useMemo(() => ({ toast }), [toast])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-region" role="status" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast toast--${t.tone}`}>
              <span className="toast__msg">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast__act"
                  onClick={() => { t.action!.onClick(); dismiss(t.id) }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
