import { ArrowRight, Mic, Volume2 } from 'lucide-react'

/**
 * VoiceControls — mic button + speaker + next arrow for sentence/cloze practice.
 * Hold mic to record, tap speaker to replay, tap arrow to skip.
 */
export function VoiceControls({
  isListening,
  isSpeaking,
  onPlayAudio,
  onStartRecording,
  onStopRecording,
  onNext,
}: {
  isListening: boolean
  isSpeaking: boolean
  onPlayAudio: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onNext: () => void
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-3 pb-1">
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]"
        onClick={onPlayAudio}
        disabled={isSpeaking}
      >
        <Volume2 className="h-5 w-5" strokeWidth={2} />
      </button>
      <button
        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition ${
          isListening
            ? 'border-[var(--error)] bg-[var(--error)] text-white pulse-ring'
            : 'border-[var(--accent)] bg-[var(--accent)] text-white'
        }`}
        onPointerDown={onStartRecording}
        onPointerUp={onStopRecording}
        onPointerLeave={onStopRecording}
      >
        <Mic className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--glass)] text-[var(--muted)]"
        onClick={onNext}
      >
        <ArrowRight className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  )
}
