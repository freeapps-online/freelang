export function MicButton({ listening, onPress, onRelease, disabled }: {
  listening: boolean
  onPress: () => void
  onRelease: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
        listening
          ? 'bg-[var(--accent)] text-white scale-110'
          : disabled
          ? 'bg-[var(--surface)] text-[var(--text-muted)] opacity-50'
          : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
      }`}
      onPointerDown={disabled ? undefined : onPress}
      onPointerUp={listening ? onRelease : undefined}
      onPointerLeave={listening ? onRelease : undefined}
      disabled={disabled}
    >
      {listening && (
        <div className="absolute inset-0 rounded-full bg-[var(--accent)]/30 pulse-ring" />
      )}
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </button>
  )
}
