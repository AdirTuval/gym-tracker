import { useEffect, useState } from 'react'
import { clock } from '../lib/format'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Live mm:ss / h:mm:ss since `since`. Its own component so only it re-renders every second. */
export function Elapsed({ since, until }: { since: number; until?: number }) {
  const now = useNow()
  return <span dir="ltr">{clock((until ?? now) - since)}</span>
}
