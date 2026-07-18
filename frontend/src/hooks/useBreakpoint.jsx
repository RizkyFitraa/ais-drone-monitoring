import { useState, useEffect } from 'react'

/*
  Breakpoints:
    xs  < 480px   — phone portrait
    sm  < 768px   — phone landscape / small tablet
    md  < 1024px  — tablet
    lg  < 1280px  — small desktop
    xl  >= 1280px — desktop
*/

const BP = { xs:480, sm:768, md:1024, lg:1280 }

function calc(w) {
  if (w < BP.xs) return 'xs'
  if (w < BP.sm) return 'sm'
  if (w < BP.md) return 'md'
  if (w < BP.lg) return 'lg'
  return 'xl'
}

export function useBreakpoint() {
  const [bp, setBp] = useState(() => calc(window.innerWidth))
  const [w,  setW]  = useState(() => window.innerWidth)

  useEffect(() => {
    let raf
    const h = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nw = window.innerWidth
        setW(nw)
        setBp(calc(nw))
      })
    }
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('resize', h); cancelAnimationFrame(raf) }
  }, [])

  return {
    bp, w,
    isMobile:  bp === 'xs' || bp === 'sm',          // < 768
    isTablet:  bp === 'md',                          // 768-1023
    isDesktop: bp === 'lg' || bp === 'xl',           // >= 1024
    isSmall:   bp === 'xs' || bp === 'sm' || bp === 'md', // < 1024
  }
}
