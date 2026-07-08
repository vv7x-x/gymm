/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { t as translate } from '../lib/i18n'

interface I18nContextType {
  lang: 'en' | 'ar'
  setLang: (lang: 'en' | 'ar') => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: () => '',
  dir: 'ltr',
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<'en' | 'ar'>(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('gymos_prefs') || '{}')
      return prefs.lang || 'en'
    } catch {
      return 'en'
    }
  })

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    try {
      const prefs = JSON.parse(localStorage.getItem('gymos_prefs') || '{}')
      prefs.lang = lang
      localStorage.setItem('gymos_prefs', JSON.stringify(prefs))
    } catch {}
  }, [lang])

  const setLang = (l: 'en' | 'ar') => setLangState(l)
  const t = (key: string) => translate(key, lang)
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
