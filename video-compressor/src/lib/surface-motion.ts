import { useEffect, useRef, type PointerEvent } from 'react'

/** 高频指针位置只写 CSS 变量，不触发 React 重渲染。 */
export function useSurfaceMotion() {
  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function move(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const node = event.currentTarget
    const box = node.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty('--pointer-x', `${x * 100}%`)
      node.style.setProperty('--pointer-y', `${y * 100}%`)
      node.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`)
      node.style.setProperty('--tilt-y', `${(x - 0.5) * 6}deg`)
    })
  }

  function leave(event: PointerEvent<HTMLElement>) {
    cancelAnimationFrame(frame.current)
    event.currentTarget.style.removeProperty('--tilt-x')
    event.currentTarget.style.removeProperty('--tilt-y')
  }

  return { onPointerMove: move, onPointerLeave: leave }
}
