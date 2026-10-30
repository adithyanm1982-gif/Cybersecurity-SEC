import { useEffect } from 'react'
import { useSettings } from '../settings.jsx'
import { sfx } from '../fx.js'

// which sound belongs to which kind of control
function soundFor(el) {
  const is = (sel) => el.matches(sel)
  if (is('.danger, .auth-out')) return 'danger'
  if (is('.switch, .seg button, .swatch')) return 'toggle'
  if (is('.nav a, .pagenav button')) return 'nav'
  if (is('.icon-btn')) return el.closest('.settings') ? 'close' : 'open'
  if (is('.acc-head')) return 'open'
  if (is('.folder, .photo, .chip, .member-photo')) return 'select'
  if (is('.cbtn.ghost, .mini, .lb-nav')) return 'soft'
  if (is('.cbtn')) return 'click'
  return 'soft'
}

// Plays the right sound for every click on the whole site (and keeps the sound engine in sync with Settings).
export default function SoundFx() {
  const { s } = useSettings()

  useEffect(() => { sfx.configure({ enabled: s.sound, volume: s.volume / 100 }) }, [s.sound, s.volume])

  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest && e.target.closest('button, a, [role="button"]')
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return
      sfx.play(soundFor(el))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}