import { Mic } from 'lucide-react'

export function MicButton({
  listening,
  onPress,
  onRelease,
  disabled,
}: {
  listening: boolean
  onPress: () => void
  onRelease: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`relative flex h-20 w-20 items-center justify-center rounded-full border shadow-[var(--shadow-soft)] sm:h-24 sm:w-24 ${
        listening
          ? 'glow border-[var(--accent)] bg-[var(--accent)] text-white'
          : disabled
            ? 'border-[var(--line)] bg-[var(--glass-soft)] text-[var(--muted)] opacity-55'
            : 'border-[var(--line)] bg-[var(--glass)] text-[var(--ink)] hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:bg-[var(--glass-hover)]'
      }`}
      onPointerDown={disabled ? undefined : onPress}
      onPointerUp={listening ? onRelease : undefined}
      onPointerLeave={listening ? onRelease : undefined}
      disabled={disabled}
    >
      {listening && <div className="pulse-ring absolute inset-0 rounded-full bg-[var(--accent)]/25" />}
      <div className={`absolute inset-[7px] rounded-full border ${listening ? 'border-white/25' : 'border-[var(--line-strong)]'}`} />
      <Mic className="relative z-10 h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2.2} />
    </button>
  )
}
