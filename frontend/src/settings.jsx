import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'ts-theme-v3'

// everything except the theme is now fixed (sound is always on, one accent colour)
const FIXED = {
  accent: 'cyan',
  sound: true,
  volume: 90,
  reduceMotion: false,
  fontSize: 'medium',
}

export const ACCENTS = {
  cyan: { dark: '#22d3ee', light: '#0e7490' },
}

const Ctx = createContext(null)
export const useSettings = () => useContext(Ctx)

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, theme) } catch {}
    const root = document.documentElement
    root.style.setProperty('--accent', ACCENTS.cyan[theme])
    root.dataset.theme = theme
    root.dataset.motion = 'full'
    root.dataset.font = 'medium'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f3f5f9' : '#05070b')
  }, [theme])

  const s = { ...FIXED, theme }
  const set = (k, v) => { if (k === 'theme') setTheme(v === 'light' ? 'light' : 'dark') }
  const reset = () => setTheme('dark')
  return <Ctx.Provider value={{ s, set, reset }}>{children}</Ctx.Provider>
}