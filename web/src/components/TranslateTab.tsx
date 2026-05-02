import { useState, useCallback } from 'react'
import { speech } from '../services/speech.ts'
import { useSpeech } from '../hooks.ts'
import { MicButton } from './MicButton.tsx'
import { LANGUAGES, type Message } from '../types.ts'

type ActiveMic = 'native' | 'target' | null

export function TranslateTab({ nativeLang, targetLang }: { nativeLang: string; targetLang: string }) {
  const sp = useSpeech()
  const [messages, setMessages] = useState<Message[]>([])
  const [activeMic, setActiveMic] = useState<ActiveMic>(null)

  const nativeFlag = LANGUAGES.find(l => l.code === nativeLang)?.flag ?? ''
  const targetFlag = LANGUAGES.find(l => l.code === targetLang)?.flag ?? ''

  const addMessage = useCallback((text: string, speaker: 'user' | 'other', lang: string) => {
    // TODO: integrate real translation API
    const isNative = lang === nativeLang
    const translation = isNative ? `[${targetLang}] ${text}` : `[${nativeLang}] ${text}`

    const msg: Message = {
      id: Date.now().toString(),
      text,
      translation,
      speaker,
      lang,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, msg])
  }, [nativeLang, targetLang])

  const handleStartNative = useCallback(() => {
    setActiveMic('native')
    speech.startListening(nativeLang, (text) => {
      addMessage(text, 'user', nativeLang)
      setActiveMic(null)
    })
  }, [nativeLang, addMessage])

  const handleStartTarget = useCallback(() => {
    setActiveMic('target')
    speech.startListening(targetLang, (text) => {
      addMessage(text, 'other', targetLang)
      setActiveMic(null)
    })
  }, [targetLang, addMessage])

  const handleRelease = useCallback(() => {
    speech.stopListening()
    setActiveMic(null)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] px-4 pt-4">
      <h2 className="text-lg font-semibold text-center mb-2">Live Translation</h2>
      <p className="text-xs text-[var(--text-muted)] text-center mb-4">
        Two mics: one for you, one for the other speaker
      </p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-sm text-[var(--text-muted)] text-center mt-12">
            Start a conversation. Use the left mic for your language, right mic for theirs.
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
            {msg.translation && (
              <div className={`max-w-[80%] mt-1 px-4 py-1.5 rounded-lg bg-[var(--surface-hover)] text-xs text-[var(--text-muted)]`}>
                {msg.translation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Live transcript */}
      {sp.isListening && sp.transcript && (
        <div className="text-sm text-[var(--text-muted)] italic text-center mb-2">"{sp.transcript}"</div>
      )}

      {/* Dual mic controls */}
      <div className="flex justify-center items-center gap-8 pb-4">
        <div className="flex flex-col items-center gap-1">
          <MicButton
            listening={activeMic === 'native'}
            disabled={sp.isSpeaking || activeMic === 'target'}
            onPress={handleStartNative}
            onRelease={handleRelease}
          />
          <span className="text-xs text-[var(--text-muted)]">{nativeFlag} You</span>
        </div>

        <div className="w-px h-16 bg-[var(--border)]" />

        <div className="flex flex-col items-center gap-1">
          <MicButton
            listening={activeMic === 'target'}
            disabled={sp.isSpeaking || activeMic === 'native'}
            onPress={handleStartTarget}
            onRelease={handleRelease}
          />
          <span className="text-xs text-[var(--text-muted)]">{targetFlag} Them</span>
        </div>
      </div>
    </div>
  )
}
