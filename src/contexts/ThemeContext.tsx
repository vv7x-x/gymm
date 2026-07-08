/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ThemeContextType {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('gymos_prefs') || '{}')
      return prefs.theme || 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      const prefs = JSON.parse(localStorage.getItem('gymos_prefs') || '{}')
      prefs.theme = theme
      localStorage.setItem('gymos_prefs', JSON.stringify(prefs))
    } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
