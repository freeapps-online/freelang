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

vi.mock('./services/levelMetadata.ts', () => ({
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
  SentencesTab: ({ lengthFilter, showStats }: { lengthFilter: 'short' | 'long'; showStats: boolean }) => (
    <div data-testid="sentences-tab">{showStats ? `sentences-stats-${lengthFilter}` : `sentences-${lengthFilter}`}</div>
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

  it('renders fullscreen flashcards directly inside main on /cards', async () => {
    render(<App />)

    const main = screen.getByRole('main')
    const flashcards = await screen.findByTestId('flashcards-tab')

    expect(main.firstElementChild).toBe(flashcards)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('renders fullscreen sentences directly inside main on /sentences', async () => {
    window.history.pushState({}, '', '/sentences')

    render(<App />)

    const main = screen.getByRole('main')
    const sentences = await screen.findByTestId('sentences-tab')

    expect(main.firstElementChild).toBe(sentences)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('aliases /phrases to the merged sentences mode with the short filter', async () => {
    window.history.pushState({}, '', '/phrases')

    render(<App />)

    const main = screen.getByRole('main')
    const sentences = await screen.findByTestId('sentences-tab')

    expect(main.firstElementChild).toBe(sentences)
    expect(sentences).toHaveTextContent('sentences-short')
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('renders fullscreen spelling directly inside main on /spelling', async () => {
    window.history.pushState({}, '', '/spelling')

    render(<App />)

    const main = screen.getByRole('main')
    const spelling = await screen.findByTestId('spelling-tab')

    expect(main.firstElementChild).toBe(spelling)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('renders fullscreen cloze directly inside main on /cloze', async () => {
    window.history.pushState({}, '', '/cloze')

    render(<App />)

    const main = screen.getByRole('main')
    const cloze = await screen.findByTestId('cloze-tab')

    expect(main.firstElementChild).toBe(cloze)
    expect(main.querySelector('section')).not.toBeInTheDocument()
  })

  it('wraps preferences content in a section on /preferences', async () => {
    window.history.pushState({}, '', '/preferences')

    render(<App />)

    const main = screen.getByRole('main')
    const prefs = await screen.findByTestId('preferences-tab')

    expect(main.firstElementChild?.tagName).toBe('SECTION')
    expect(main.firstElementChild).toContainElement(prefs)
  })

  it('navigates between modes with the tab buttons', async () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Cloze' })[0])

    expect(window.location.pathname).toBe('/cloze')
    expect(await screen.findByTestId('cloze-tab')).toBeInTheDocument()
  })

  it('surfaces the flashcard mode switch in app chrome', () => {
    render(<App />)

    fireEvent.click(screen.getAllByRole('button', { name: /speak/i })[0])

    expect(updateMock).toHaveBeenCalledWith({ flashcardInputMode: 'speak' })
  })

  it('opens sentence stats from sentences mode', async () => {
    window.history.pushState({}, '', '/speak')

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Sentence Stats' }))

    expect(await screen.findByTestId('sentences-tab')).toHaveTextContent('sentences-stats-long')
  })
})
