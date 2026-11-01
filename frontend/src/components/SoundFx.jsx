import { useEffect } from 'react'
import { sfx } from '../fx.js'

// which sound belongs to which kind of control
function soundFor(el) {
  const is = (sel) => el.matches(sel)
  if (is('.danger, .auth-out')) return 'danger'
  if (is('.seg button')) return 'toggle'
  if (is('.nav a, .pagenav button')) return 'nav'
  if (is('.profile-btn')) return 'open'
  if (is('.icon-btn')) return el.closest('.settings') ? 'close' : 'open'
  if (is('.folder, .photo, .chip')) return 'select'
  if (is('.cbtn.ghost, .mini, .lb-nav')) return 'soft'
  if (is('.cbtn')) return 'click'
  return 'soft'
}

// Plays the right sound for every click on the whole site. Sound is permanently ON.
export default function SoundFx() {
  useEffect(() => { sfx.configure({ enabled: true, volume: 0.9 }) }, [])

  useEffect(() => {
    // the browser only allows audio after the first tap / click / key press: unlock it on that first one
    const unlock = () => sfx.unlock()
    addEventListener('pointerdown', unlock, { once: true })
    addEventListener('keydown', unlock, { once: true })

    const onClick = (e) => {
      const el = e.target.closest && e.target.closest('button, a, [role="button"]')
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return
      sfx.play(soundFor(el), undefined, true)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      removeEventListener('pointerdown', unlock)
      removeEventListener('keydown', unlock)
    }
  }, [])

  return null
}