import { useState, useCallback, useRef, useEffect } from 'react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import { MicButton } from './MicButton.tsx'
import type { Message } from '../types.ts'

export function ConversationTab({ targetLang }: { targetLang: string }) {
  const sp = useSpeech()
  const [messages, setMessages] = useState<Message[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSpeech = useCallback((text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      speaker: 'user',
      lang: targetLang,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])

    setTimeout(() => {
      const appMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `[AI response in ${targetLang} would go here]`,
        speaker: 'app',
        lang: targetLang,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, appMessage])
      speech.speak(appMessage.text, targetLang)
    }, 500)
  }, [targetLang])

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--glass-strong)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex h-full flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-deep)]">Conversation mode</div>
            <h3 className="display-font text-3xl leading-none text-[var(--ink)]">Keep the reply loop alive.</h3>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              This surface is intentionally calmer than live translation. You speak, the app answers, and the thread stays in your target language.
            </p>
          </div>

          <div ref={scrollRef} className="min-h-[22rem] flex-1 space-y-3 overflow-y-auto rounded-[1.4rem] border border-[var(--line)] bg-[var(--cool-gradient)] p-4">
            {messages.length === 0 && (
              <div className="rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[var(--glass-soft)] px-4 py-10 text-center text-sm leading-6 text-[var(--muted)]">
                Start speaking in your target language. Replies will stack here like a guided notebook conversation.
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-[var(--shadow-card)] ${
                  message.speaker === 'user'
                    ? 'bg-[var(--ink)] text-[var(--paper)]'
                    : 'border border-[var(--line)] bg-[var(--glass)] text-[var(--ink)]'
                }`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          {sp.isListening && sp.transcript && (
            <div className="rounded-full bg-[var(--glass)] px-4 py-2 text-center text-sm italic text-[var(--muted)]">
              “{sp.transcript}”
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--cool-gradient)] p-4 shadow-[var(--shadow-card)]">
        <div className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Speak cue</div>
        <div className="mt-3 rounded-[1.2rem] border border-[var(--line)] bg-[var(--glass)] p-4 text-sm leading-6 text-[var(--muted)]">
          Keep answers short. One sentence is enough to stay in flow and reduce hesitation.
        </div>

        <div className="mt-4 rounded-[1.3rem] border border-[var(--line)] bg-[var(--glass)] px-4 py-5 text-center">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Target microphone</div>
          <div className="mt-4 flex justify-center">
            <MicButton
              listening={sp.isListening}
              disabled={sp.isSpeaking}
              onPress={() => speech.startListening(targetLang, handleSpeech)}
              onRelease={() => speech.stopListening()}
            />
          </div>
          <div className="mt-4 text-sm font-semibold text-[var(--ink)]">Hold to speak in {targetLang.toUpperCase()}</div>
        </div>
      </aside>
    </div>
  )
}
