import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings, ACCENTS } from '../settings.jsx'
import { useAuth } from '../auth.jsx'

function Toggle({ label, k, hint }) {
  const { s, set } = useSettings()
  return (
    <div className="set-row">
      <span>{label}<small>{hint}</small></span>
      <button type="button" className={`switch ${s[k] ? 'on' : ''}`} onClick={() => set(k, !s[k])} aria-pressed={s[k]} aria-label={label}><i /></button>
    </div>
  )
}

export default function SettingsPanel({ open, onClose }) {
  const { s, set, reset } = useSettings()
  const { user, isAdmin, logout } = useAuth()
  const nav = useNavigate()
  const [ui, setUi] = useState(false) // the single UI CONTROLS button

  const go = (path, state) => { onClose(); nav(path, state ? { state } : undefined) }
  const initial = ((user?.name || user?.email || '?')[0] || '?').toUpperCase()

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`settings ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="settings-head">
          <h3 className="glitch" data-text="SETTINGS">SETTINGS</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        {/* ---------- ACCOUNT: login / create account / logout ---------- */}
        <section className="acct">
          <div className="set-title">// ACCOUNT</div>
          {user ? (
            <>
              <div className="acct-card">
                <span className="acct-avatar">{initial}</span>
                <div className="acct-info"><b>{user.name || 'Member'}</b><small>{user.email}</small></div>
                <span className={`role-badge ${isAdmin ? 'admin' : ''}`}>{isAdmin ? 'ADMIN' : 'USER'}</span>
              </div>
              <div className="acct-actions">
                {isAdmin && <button className="cbtn" onClick={() => go('/admin')}><span>ADMIN CONSOLE</span></button>}
                <button className="cbtn ghost" onClick={() => go('/join')}><span>JOIN THE DOMAIN</span></button>
                <button className="cbtn alt" onClick={() => { logout(); onClose(); nav('/') }}><span>LOG OUT</span></button>
              </div>
            </>
          ) : (
            <>
              <p className="acct-note">You are browsing as a guest. Sign in to apply to the domain.</p>
              <div className="acct-actions">
                <button className="cbtn" onClick={() => go('/login', { mode: 'login' })}><span>LOGIN</span></button>
                <button className="cbtn ghost" onClick={() => go('/login', { mode: 'signup' })}><span>CREATE ACCOUNT</span></button>
              </div>
              <p className="set-foot">Sign-in uses your Google account. Your first sign-in creates the account automatically.</p>
            </>
          )}
        </section>

        {/* ---------- ONE button that holds every UI control ---------- */}
        <div className={`acc ${ui ? 'open' : ''}`}>
          <button className="acc-head" onClick={() => setUi((o) => !o)} aria-expanded={ui}>
            <span>UI CONTROLS<small>theme · accent · effects · motion · text size</small></span>
            <span className="acc-arrow">▶</span>
          </button>
          <div className="acc-body">
            <div>
              <div className="set-title">// DISPLAY MODE</div>
              <div className="seg">
                <button className={s.theme === 'dark' ? 'on' : ''} onClick={() => set('theme', 'dark')}>☾ DARK</button>
                <button className={s.theme === 'light' ? 'on' : ''} onClick={() => set('theme', 'light')}>☀ LIGHT</button>
              </div>
            </div>

            <div>
              <div className="set-title">// NEON ACCENT</div>
              <div className="swatches">
                {Object.entries(ACCENTS).map(([name, cols]) => (
                  <button key={name} title={name} aria-label={`${name} accent`} className={`swatch ${s.accent === name ? 'on' : ''}`} style={{ '--c': cols[0] }} onClick={() => set('accent', name)} />
                ))}
              </div>
            </div>

            <div>
              <div className="set-title">// EFFECTS</div>
              <Toggle k="rain" label="Code Rain" hint="falling matrix glyphs" />
              <Toggle k="scanlines" label="CRT Scanlines" hint="retro monitor overlay" />
              <Toggle k="glitch" label="Glitch Text" hint="animated title glitches" />
              <Toggle k="trail" label="Cursor Trail" hint="neon particles follow mouse" />
              <Toggle k="clickFx" label="Click Burst" hint="particles on every click" />
              <Toggle k="sound" label="UI Sounds" hint="beeps on hover & click" />
            </div>

            <div>
              <div className="set-title">// ACCESSIBILITY</div>
              <Toggle k="reduceMotion" label="Reduce Motion" hint="calms all animations" />
              <div className="set-title" style={{ marginTop: 14 }}>TEXT SIZE</div>
              <div className="seg" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                {['small', 'medium', 'large'].map((f) => (
                  <button key={f} className={s.fontSize === f ? 'on' : ''} onClick={() => set('fontSize', f)}>{f.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div>
              <button className="cbtn ghost" onClick={reset}><span>RESET ALL SETTINGS</span></button>
            </div>
          </div>
        </div>

        <p className="set-foot">
          THE TECH SOCIETY // CYBERSECURITY<br />
          Saveetha Engineering College<br />
          Display settings are saved on this device only.
        </p>
      </aside>
    </>
  )
}