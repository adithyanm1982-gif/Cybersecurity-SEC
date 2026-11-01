import { useEffect, useState } from 'react'
import { useScramble } from '../hooks.js'
import { sfx } from '../fx.js'

const BOOT = [
  '> Initializing secure environment ........ OK',
  '> Loading security modules ............... OK',
  '> Establishing encrypted channel ......... OK',
  '> Verifying system integrity ............. OK',
]

// The cyberpunk intro. It starts immediately (there is no "Enter" page).
// Browsers block sound until the visitor's first tap / click / key press: if that has not happened yet,
// a small hint appears, and the sounds start from the moment the visitor taps.
export default function Intro({ onDone }) {
  const [stage, setStage] = useState(0) // 0 boot, 1 CYBERSECURITY, 2 TECH SOCIETY, 3 exit
  const [lines, setLines] = useState(0)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    sfx.unlock() // works straight away when the browser allows it (e.g. returning visitors on desktop)
    const refresh = () => setLocked(sfx.locked())
    refresh()
    const stop = sfx.watch(refresh)

    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    BOOT.forEach((_, i) => at(250 + i * 380, () => { setLines(i + 1); sfx.play('introBlip', i) }))
    at(1500, () => sfx.play('introRise'))
    at(2700, () => { setStage(1); sfx.play('introHit') })
    at(4700, () => { setStage(2); sfx.play('introAccess') })
    at(6900, () => { setStage(3); sfx.play('introOut') })
    at(7700, onDone)
    return () => { timers.forEach(clearTimeout); stop() }
    // eslint-disable-next-line
  }, [])

  const t1 = useScramble('CYBERSECURITY', stage === 1, 45)
  const t2 = useScramble('TECH SOCIETY', stage === 2, 55)

  return (
    <div className={`intro ${stage === 3 ? 'exit' : ''}`}>
      <div className="intro-grid" />
      <div className="intro-boot">
        {BOOT.slice(0, lines).map((l) => <div key={l}>{l}</div>)}
      </div>

      {stage === 1 && <h1 className="intro-title">{t1}</h1>}
      {stage >= 2 && (
        <>
          <h1 className="intro-title small dim">CYBERSECURITY</h1>
          <h1 className="intro-title hot">{t2}</h1>
          <div className="intro-sub">SAVEETHA ENGINEERING COLLEGE · ACCESS GRANTED</div>
        </>
      )}
      <div className="intro-bar"><span /></div>
      {locked && <div className="intro-hint">Tap anywhere to enable sound</div>}
      <button className="intro-skip" onClick={onDone}>Skip intro</button>
    </div>
  )
}