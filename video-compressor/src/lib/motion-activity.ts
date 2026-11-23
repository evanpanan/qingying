import { useEffect, useRef, useState } from 'react'

/** Offscreen, hidden-tab and reduced-motion surfaces stay still. */
export function useMotionActivity<T extends HTMLElement>() {
  const root = useRef<T>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const node = root.current
    if (!node) return
    let visible = false
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setActive(visible && !document.hidden && !preference.matches)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    }, { threshold: 0.08 })
    observer.observe(node)
    preference.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return { root, active }
}
