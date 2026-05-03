import { describe, it, expect } from 'vitest'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import de from './de.json'
import ru from './ru.json'

const enKeys = Object.keys(en)

describe('locale completeness', () => {
  it('en.json has all keys (source of truth)', () => {
    expect(enKeys.length).toBeGreaterThan(100)
  })

  it('es.json keys are valid en keys', () => {
    for (const key of Object.keys(es)) {
      expect(enKeys).toContain(key)
    }
  })

  it('fr.json keys are valid en keys', () => {
    for (const key of Object.keys(fr)) {
      expect(enKeys).toContain(key)
    }
  })

  it('de.json keys are valid en keys', () => {
    for (const key of Object.keys(de)) {
      expect(enKeys).toContain(key)
    }
  })

  it('ru.json keys are valid en keys', () => {
    for (const key of Object.keys(ru)) {
      expect(enKeys).toContain(key)
    }
  })

  it('no locale has keys that en.json does not', () => {
    const locales = { es, fr, de, ru }
    for (const [name, locale] of Object.entries(locales)) {
      for (const key of Object.keys(locale)) {
        expect(enKeys, `${name} has unknown key: ${key}`).toContain(key)
      }
    }
  })
})
