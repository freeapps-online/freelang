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
    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      speaker: 'user',
      lang: targetLang,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    // TODO: integrate LLM for conversation responses
    // For now, echo back a placeholder response
    setTimeout(() => {
      const appMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: `[AI response in ${targetLang} would go here]`,
        speaker: 'app',
        lang: targetLang,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, appMsg])

      // Speak the response
      speech.speak(appMsg.text, targetLang)
    }, 500)
  }, [targetLang])

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] px-4 pt-4">
      <h2 className="text-lg font-semibold text-center mb-2">Conversation</h2>
      <p className="text-xs text-[var(--text-muted)] text-center mb-4">
        Talk freely in your target language
      </p>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] text-center mt-12">
            Start speaking in your target language. The app will respond and keep the conversation going.
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.speaker === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.speaker === 'user'
                ? 'bg-[var(--accent)] text-white rounded-br-sm'
                : 'bg-[var(--surface)] border border-[var(--border)] rounded-bl-sm'
            }`}>
              <div className="text-sm">{msg.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Live transcript */}
      {sp.isListening && sp.transcript && (
        <div className="text-sm text-[var(--text-muted)] italic text-center mb-2">"{sp.transcript}"</div>
      )}

      {/* Mic */}
      <div className="flex justify-center pb-4">
        <div className="flex flex-col items-center gap-1">
          <MicButton
            listening={sp.isListening}
            disabled={sp.isSpeaking}
            onPress={() => speech.startListening(targetLang, handleSpeech)}
            onRelease={() => speech.stopListening()}
          />
          <span className="text-xs text-[var(--text-muted)]">Hold to speak</span>
        </div>
      </div>
    </div>
  )
}
