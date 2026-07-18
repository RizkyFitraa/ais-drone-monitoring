import { useState, useEffect } from 'react'

/**
 * useBlink
 * Returns a boolean that toggles at the given interval (ms).
 * Used for live-indicator dots throughout the UI.
 */
export function useBlink(intervalMs = 800) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return on
}
