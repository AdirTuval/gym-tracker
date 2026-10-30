import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Icon } from './Icon'

const ToastContext = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; key: number; out: boolean } | null>(null)
  const timers = useRef<number[]>([])

  const show = useCallback((msg: string) => {
    timers.current.forEach(clearTimeout)
    const key = Date.now()
    setToast({ msg, key, out: false })
    timers.current = [
      window.setTimeout(() => setToast(t => (t && t.key === key ? { ...t, out: true } : t)), 2200),
      window.setTimeout(() => setToast(t => (t && t.key === key ? null : t)), 2500),
    ]
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-root" role="status" aria-live="polite">
        {toast && (
          <div key={toast.key} className={`toast ${toast.out ? 'out' : ''}`}>
            <span className="ti"><Icon name="check" size="sm" /></span>
            {toast.msg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
