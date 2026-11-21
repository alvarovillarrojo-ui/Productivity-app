// Language support (English / Spanish).
//
// Usage in a screen:
//   const { t, date } = useI18n()
//   <h1>{t.tasks.title}</h1>
//   {date('2026-11-16')}   → "Mon 16 Nov" / "lun 16 nov"
//
// The chosen language is a per-device preference, kept in the browser's
// localStorage (it isn't user data, so it's not part of backups). On first
// visit the browser's own language is used.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ISODate } from '../data/types'
import { formatShortDate } from '../logic/weeks'
import { en, type Dict } from './en'
import { es } from './es'

export type Lang = 'en' | 'es'

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
]

const DICTS: Record<Lang, Dict> = { en, es }
const LOCALES: Record<Lang, string> = { en: 'en-GB', es: 'es-ES' }
const STORAGE_KEY = 'language'

/** Saved choice, else the browser language, else English. */
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    // storage blocked: fall through
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
}

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  /** All texts in the current language. */
  t: Dict
  /** Locale code for number/date formatting, e.g. "es-ES". */
  locale: string
  /** Short date in the current language, e.g. "Mon 16 Nov". */
  date: (d: ISODate) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // not saved; still works for this visit
    }
  }

  const locale = LOCALES[lang]
  const value: I18n = {
    lang,
    setLang,
    t: DICTS[lang],
    locale,
    date: (d) => formatShortDate(d, locale),
  }
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
