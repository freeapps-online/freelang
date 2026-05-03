import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

const updateMock = vi.fn()

vi.mock('./hooks.ts', () => ({
  useSettings: () => ({
    settings: {
      interfaceLang: 'en',
      nativeLang: 'en',
      targetLang: 'es',
      theme: 'system',
      labelSize: 'medium',
      contentSize: 'medium',
      motion: 'full',
      surface: 'soft',
      flashcardAudio: true,
      flashcardInputMode: 'keyboard',
      sentenceInputMode: 'keyboard',
      cardLevel: 1,
    },
    update: updateMock,
  }),
  useApplySettings: () => undefined,
}))

vi.mock('./services/vocabulary.ts', () => ({
  LEVEL_LABELS: { 1: 'Basics', 2: 'Daily Life' },
  LEVELS: [1, 2],
}))

vi.mock('./components/LanguagePicker.tsx', () => ({
  LanguagePicker: ({ label, compact }: { label: string; compact?: boolean }) => (
    <div data-testid={compact ? 'language-picker-compact' : `language-picker-${label || 'empty'}`}>
      {label || 'compact'}
    </div>
  ),
}))

vi.mock('./components/FlashcardsTab.tsx', () => ({
  FlashcardsTab: () => <div data-testid="flashcards-tab">flashcards</div>,
}))

vi.mock('./components/SpeakTab.tsx', () => ({
  SentencesTab: ({ showStats }: { showStats: boolean }) => <div data-testid="sentences-tab">{showStats ? 'sentence-stats' : 'sentences'}</div>,
}))

vi.mock('./components/PreferencesTab.tsx', () => ({
  PreferencesTab: () => <div data-testid="preferences-tab">preferences</div>,
}))

describe('App', () => {
  beforeEach(() => {
    updateMock.mockReset()
    window.history.pushState({}, '', '/cards')
  })

  it('renders fullscreen flashcards directly inside main on /cards', () => {
    render(<App />)

    const main = screen.getByRole('main')
    const flashcards = screen.getByTestId('flashcards-tab')

    expect(main.firstElementChild).toBe(flashcards)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('renders fullscreen sentences directly inside main on /sentences', () => {
    window.history.pushState({}, '', '/sentences')

    render(<App />)

    const main = screen.getByRole('main')
    const sentences = screen.getByTestId('sentences-tab')

    expect(main.firstElementChild).toBe(sentences)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('wraps preferences content in a section on /preferences', () => {
    window.history.pushState({}, '', '/preferences')

    render(<App />)

    const main = screen.getByRole('main')
    const prefs = screen.getByTestId('preferences-tab')

    expect(main.firstElementChild?.tagName).toBe('SECTION')
    expect(main.firstElementChild).toContainElement(prefs)
  })

  it('navigates between modes with the tab buttons', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Sentences' })[0])

    expect(window.location.pathname).toBe('/sentences')
    expect(screen.getByTestId('sentences-tab')).toBeInTheDocument()
  })

  it('surfaces the flashcard mode switch in app chrome', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: /speak/i })[0])

    expect(updateMock).toHaveBeenCalledWith({ flashcardInputMode: 'speak' })
  })

  it('opens sentence stats from sentences mode', () => {
    window.history.pushState({}, '', '/speak')

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Sentence Stats' }))

    expect(screen.getByTestId('sentences-tab')).toHaveTextContent('sentence-stats')
  })
})
