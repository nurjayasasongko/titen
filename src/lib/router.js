import { useCallback, useEffect, useState } from 'react'

/**
 * A hash router in thirty lines, because every page here needs to be a
 * link you can paste to a colleague — "read #/siem/learn/correlate before
 * standup" — and no module needs anything a real router would add.
 *
 * Routes are just path segments. The shell reads the first one to pick a
 * module; everything after that belongs to the module itself.
 */
export function parseHash(hash) {
  return String(hash ?? '')
    .replace(/^#/, '')
    .split('/')
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean)
}

export function formatHash(segments) {
  const clean = (segments ?? [])
    .filter((segment) => segment !== null && segment !== undefined && segment !== '')
    .map((segment) => encodeURIComponent(String(segment)))
  return clean.length ? `#/${clean.join('/')}` : '#/'
}

export function useHashRoute() {
  const [segments, setSegments] = useState(() =>
    typeof window === 'undefined' ? [] : parseHash(window.location.hash),
  )

  useEffect(() => {
    const sync = () => setSegments(parseHash(window.location.hash))
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const navigate = useCallback((next) => {
    const hash = formatHash(next)
    if (window.location.hash === hash) return
    window.location.hash = hash
  }, [])

  return [segments, navigate]
}
