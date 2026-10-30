import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentType } from 'react'

// iOS-style stack navigation. In RTL a pushed screen slides in from the left.

export type ScreenProps = { params?: unknown }
type Phase = 'enter' | 'active' | 'behind' | 'leave'
interface Entry { key: number; name: string; params?: unknown; phase: Phase }

interface Nav {
  push: (name: string, params?: unknown) => void
  pop: () => void
  reset: (name: string) => void
}
const NavContext = createContext<Nav | null>(null)
export const useNav = () => {
  const nav = useContext(NavContext)
  if (!nav) throw new Error('useNav must be used inside <Navigator>')
  return nav
}

const DURATION = 450
const nextFrame = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn))

export function Navigator({ screens, initial }: { screens: Record<string, ComponentType<ScreenProps>>; initial: string }) {
  const [stack, setStack] = useState<Entry[]>([{ key: 0, name: initial, phase: 'active' }])
  const nextKey = useRef(1)

  const push = useCallback((name: string, params?: unknown) => {
    const key = nextKey.current++
    setStack(s => [...s, { key, name, params, phase: 'enter' }])
    nextFrame(() =>
      setStack(s => s.map(e => (e.key === key ? { ...e, phase: 'active' } : e.phase === 'active' ? { ...e, phase: 'behind' } : e))),
    )
  }, [])

  const pop = useCallback(() => {
    setStack(s => {
      const live = s.filter(e => e.phase !== 'leave')
      if (live.length < 2) return s
      const top = live[live.length - 1].key, prev = live[live.length - 2].key
      return s.map(e => (e.key === top ? { ...e, phase: 'leave' } : e.key === prev ? { ...e, phase: 'active' } : e))
    })
    setTimeout(() => setStack(s => s.filter(e => e.phase !== 'leave')), DURATION)
  }, [])

  /** Replace the whole stack with a single screen (e.g. back to home after saving a workout). */
  const reset = useCallback((name: string) => {
    const key = nextKey.current++
    setStack(s => [...s, { key, name, phase: 'enter' }])
    nextFrame(() => setStack(s => s.map(e => (e.key === key ? { ...e, phase: 'active' } : { ...e, phase: 'behind' }))))
    setTimeout(() => setStack(s => s.filter(e => e.key === key)), DURATION + 50)
  }, [])

  const nav = useMemo(() => ({ push, pop, reset }), [push, pop, reset])

  return (
    <NavContext.Provider value={nav}>
      {stack.map(e => {
        const Screen = screens[e.name]
        const cls = e.phase === 'enter' || e.phase === 'leave' ? 'from-start' : e.phase === 'behind' ? 'behind' : ''
        return (
          <section key={e.key} className={`screen ${cls}`} inert={e.phase !== 'active'}>
            <Screen params={e.params} />
          </section>
        )
      })}
    </NavContext.Provider>
  )
}
