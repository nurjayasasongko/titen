import { useEffect, useState } from 'react'

/**
 * Whether an element has scrolled out of view.
 *
 * Used to decide when a playback control needs to follow the reader: while
 * the inline control is visible there is nothing to do, and the moment it
 * leaves the screen the floating one takes over.
 */
export function useOffscreen(ref) {
  const [offscreen, setOffscreen] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setOffscreen(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return offscreen
}
