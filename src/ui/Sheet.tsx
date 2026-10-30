import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// Bottom sheet host. Sheet content is rendered here, outside the screen that opened it,
// so sheets get what they need (callbacks, ids) through props rather than screen context.

interface SheetApi {
  open: (content: ReactNode) => void
  /** Closes the sheet; `after` runs once it has slid away (e.g. to navigate). */
  close: (after?: () => void) => void
}
const SheetContext = createContext<SheetApi>({ open: () => {}, close: () => {} })
export const useSheet = () => useContext(SheetContext)

export function SheetProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef<number>(undefined)

  const open = useCallback((node: ReactNode) => {
    clearTimeout(timer.current)
    setContent(node)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const close = useCallback((after?: () => void) => {
    setVisible(false)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setContent(null)
      after?.()
    }, after ? 260 : 380)
  }, [])

  const api = useMemo(() => ({ open, close }), [open, close])

  return (
    <SheetContext.Provider value={api}>
      {children}
      {content !== null && (
        <div className={`sheet-root ${visible ? 'open' : ''}`}>
          <div className="backdrop" onClick={() => close()} />
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="grab" />
            {content}
          </div>
        </div>
      )}
    </SheetContext.Provider>
  )
}
