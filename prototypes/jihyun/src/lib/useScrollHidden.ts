import { useEffect, useState } from 'react'

const DELTA = 8 // ignore tiny jitters
const TOP_ZONE = 80

/**
 * true while the user is scrolling down (reading), false when they scroll up or are near the top —
 * the same show/hide rhythm as mobile browser toolbars.
 */
export function useScrollHidden() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (y < TOP_ZONE) setHidden(false)
        else if (y - lastY > DELTA) setHidden(true)
        else if (lastY - y > DELTA) setHidden(false)
        else return
        lastY = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return hidden
}
