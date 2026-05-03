import { useState, useEffect } from 'react'
import { useAppState } from './useAppState.ts'
import { MobileShell } from './shells/MobileShell.tsx'
import { DesktopShell } from './shells/DesktopShell.tsx'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function App() {
  const state = useAppState()
  const isDesktop = useIsDesktop()

  return isDesktop ? <DesktopShell state={state} /> : <MobileShell state={state} />
}
