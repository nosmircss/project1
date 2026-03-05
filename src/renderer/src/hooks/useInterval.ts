import { useEffect, useRef } from 'react'

/**
 * Declarative setInterval hook. Callback ref stays fresh (no stale closures).
 * Pass delay=null to pause the interval without clearing/re-creating it.
 * Source: overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(callback)

  // Always keep ref current — runs after every render
  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
