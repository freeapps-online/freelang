import type { ReactNode } from 'react'

/**
 * PracticeLayout — the three-zone layout for all practice tabs on mobile.
 *
 * Fills the viewport between the top bar and bottom dock.
 * overflow:hidden prevents any vertical scrolling.
 * The card area (children) is centered vertically.
 */
export function PracticeLayout({
  children,
  gradient = 'var(--warm-gradient)',
}: {
  children: ReactNode
  gradient?: string
}) {
  return (
    <div className="flex h-[calc(100dvh-80px-env(safe-area-inset-bottom))] flex-col lg:h-auto">
      <section
        className="flex flex-1 flex-col overflow-hidden p-1 sm:p-3 lg:p-4"
        style={{ background: gradient }}
      >
        <div className="flex h-full flex-col gap-2">
          {children}
        </div>
      </section>
    </div>
  )
}
