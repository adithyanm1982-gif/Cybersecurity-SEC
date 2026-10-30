import { createContext, useContext, useEffect, useState } from 'react'

const KEY = 'ts-settings-v2' // new key: everyone starts from the new professional defaults

const DEFAULTS = {
  theme: 'dark',
  accent: 'cyan',
  rain: false, // optional "code stream" background
  sound: true,
  volume: 90, // percent: high by default
  reduceMotion: false,
  fontSize: 'medium',
}

// one refined accent colour per theme (the light version is darker so text stays readable on white)
export const ACCENTS = {
  cyan: { dark: '#22d3ee', light: '#0e7490' },
  blue: { dark: '#60a5fa', light: '#1d4ed8' },
  green: { dark: '#34d399', light: '#047857' },
  amber: { dark: '#fbbf24', light: '#b45309' },
}

const Ctx = createContext(null)
export const useSettings = () => useContext(Ctx)

export function SettingsProvider({ children }) {
  const [s, setS] = useState(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
    const root = document.documentElement
    const a = ACCENTS[s.accent] || ACCENTS.cyan
    root.style.setProperty('--accent', a[s.theme] || a.dark)
    root.dataset.theme = s.theme
    root.dataset.motion = s.reduceMotion ? 'reduced' : 'full'
    root.dataset.font = s.fontSize
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', s.theme === 'light' ? '#f3f5f9' : '#05070b')
  }, [s])

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }))
  const reset = () => setS(DEFAULTS)
  return <Ctx.Provider value={{ s, set, reset }}>{children}</Ctx.Provider>
}