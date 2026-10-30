import { useEffect, useState } from 'react'
import { useScramble } from '../hooks.js'
import { useSettings } from '../settings.jsx'
import { sfx } from '../fx.js'
import Logo from './Logo.jsx'

const BOOT = [
  '> Initializing secure environment ........ OK',
  '> Loading security modules ............... OK',
  '> Establishing encrypted channel ......... OK',
  '> Verifying system integrity ............. OK',
]

export default function Intro({ onDone }) {
  const { s } = useSettings()
  // Browsers only allow sound after a click, so when sound is ON the intro waits for an "Enter" click first.
  const [started, setStarted] = useState(!s.sound)
  const [stage, setStage] = useState(0) // 0 boot, 1 CYBERSECURITY, 2 TECH SOCIETY, 3 exit
  const [lines, setLines] = useState(0)

  useEffect(() => {
    if (!started) return
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    BOOT.forEach((_, i) => at(250 + i * 380, () => { setLines(i + 1); sfx.play('introBlip', i) }))
    at(1500, () => sfx.play('introRise'))
    at(2700, () => { setStage(1); sfx.play('introHit') })
    at(4700, () => { setStage(2); sfx.play('introAccess') })
    at(6900, () => { setStage(3); sfx.play('introOut') })
    at(7700, onDone)
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line
  }, [started])

  const enter = () => { sfx.unlock(); setStarted(true) }
  const skip = () => { sfx.unlock(); onDone() }

  const t1 = useScramble('CYBERSECURITY', stage === 1, 45)
  const t2 = useScramble('TECH SOCIETY', stage === 2, 55)

  return (
    <div className={`intro ${stage === 3 ? 'exit' : ''}`}>
      <div className="intro-grid" />

      {!started && (
        <div className="intro-gate">
          <Logo file="techsociety.png" label="The Tech Society" size={110} invertOnLight />
          <h1 className="intro-title small">TECH SOCIETY · CYBERSECURITY DOMAIN</h1>
          <button className="cbtn" onClick={enter}><span>Enter site</span></button>
          <p className="intro-note">Sound effects are on. You can change the volume anytime in Settings.</p>
        </div>
      )}

      {started && (
        <>
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
        </>
      )}
      <button className="intro-skip" onClick={skip}>Skip intro</button>
    </div>
  )
}