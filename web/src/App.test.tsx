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
      dictionaryDefaultView: 'dictionary',
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

vi.mock('./components/MissingLetterTab.tsx', () => ({
  MissingLetterTab: () => <div data-testid="spelling-tab">spelling</div>,
}))

vi.mock('./components/ClozeTab.tsx', () => ({
  ClozeTab: () => <div data-testid="cloze-tab">cloze</div>,
}))

vi.mock('./components/SpeakTab.tsx', () => ({
  SentencesTab: ({ contentMode, showStats }: { contentMode: 'phrases' | 'sentences'; showStats: boolean }) => (
    <div data-testid={`${contentMode}-tab`}>{showStats ? `${contentMode}-stats` : contentMode}</div>
  ),
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

  it('renders fullscreen phrases directly inside main on /phrases', () => {
    window.history.pushState({}, '', '/phrases')

    render(<App />)

    const main = screen.getByRole('main')
    const phrases = screen.getByTestId('phrases-tab')

    expect(main.firstElementChild).toBe(phrases)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('renders fullscreen spelling directly inside main on /spelling', () => {
    window.history.pushState({}, '', '/spelling')

    render(<App />)

    const main = screen.getByRole('main')
    const spelling = screen.getByTestId('spelling-tab')

    expect(main.firstElementChild).toBe(spelling)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('renders fullscreen cloze directly inside main on /cloze', () => {
    window.history.pushState({}, '', '/cloze')

    render(<App />)

    const main = screen.getByRole('main')
    const cloze = screen.getByTestId('cloze-tab')

    expect(main.firstElementChild).toBe(cloze)
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

    fireEvent.click(screen.getAllByRole('button', { name: 'Cloze' })[0])

    expect(window.location.pathname).toBe('/cloze')
    expect(screen.getByTestId('cloze-tab')).toBeInTheDocument()
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

    expect(screen.getByTestId('sentences-tab')).toHaveTextContent('sentences-stats')
  })
})
