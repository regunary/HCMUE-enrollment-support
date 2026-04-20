/**
 * English note: Invokes callback when user clicks outside the given element ref.
 */
import { useEffect, useRef } from 'react'

export function useClickOutside<T extends HTMLElement>(handler: () => void, active: boolean) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!active) {
      return undefined
    }
    const listener = (event: MouseEvent) => {
      const node = ref.current
      if (!node || node.contains(event.target as Node)) {
        return
      }
      handler()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [active, handler])

  return ref
}
