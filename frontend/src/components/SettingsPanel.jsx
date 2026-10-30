import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings, ACCENTS } from '../settings.jsx'
import { useAuth } from '../auth.jsx'
import { sfx } from '../fx.js'
import Icon from './Icons.jsx'

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
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings"><Icon name="close" size={18} /></button>
        </div>

        {/* ---------- ACCOUNT: login / create account / logout ---------- */}
        <section className="acct">
          <div className="set-title">Account</div>
          {user ? (
            <>
              <div className="acct-card">
                <span className="acct-avatar">{initial}</span>
                <div className="acct-info"><b>{user.name || 'Member'}</b><small>{user.email}</small></div>
                <span className={`role-badge ${isAdmin ? 'admin' : ''}`}>{isAdmin ? 'Admin' : 'Member'}</span>
              </div>
              <div className="acct-actions">
                {isAdmin && <button className="cbtn" onClick={() => go('/admin')}><span>Admin console</span></button>}
                <button className="cbtn ghost" onClick={() => go('/join')}><span>Join the domain</span></button>
                <button className="cbtn danger" onClick={() => { logout(); onClose(); nav('/') }}><span>Log out</span></button>
              </div>
            </>
          ) : (
            <>
              <p className="acct-note">You are browsing as a guest. Sign in to apply to the domain.</p>
              <div className="acct-actions">
                <button className="cbtn" onClick={() => go('/login', { mode: 'login' })}><span>Login</span></button>
                <button className="cbtn ghost" onClick={() => go('/login', { mode: 'signup' })}><span>Create account</span></button>
              </div>
              <p className="set-foot">Sign-in uses your Google account. Your first sign-in creates the account automatically.</p>
            </>
          )}
        </section>

        {/* ---------- ONE button that holds every UI control ---------- */}
        <div className={`acc ${ui ? 'open' : ''}`}>
          <button className="acc-head" onClick={() => setUi((o) => !o)} aria-expanded={ui}>
            <span>UI controls<small>theme · accent · sound · motion · text size</small></span>
            <Icon name="chevron-right" size={18} className="acc-arrow" />
          </button>
          <div className="acc-body">
            <div>
              <div className="set-title">Display mode</div>
              <div className="seg">
                <button className={s.theme === 'dark' ? 'on' : ''} onClick={() => set('theme', 'dark')}><Icon name="moon" size={15} /> Dark</button>
                <button className={s.theme === 'light' ? 'on' : ''} onClick={() => set('theme', 'light')}><Icon name="sun" size={15} /> Light</button>
              </div>
            </div>

            <div>
              <div className="set-title">Accent colour</div>
              <div className="swatches">
                {Object.entries(ACCENTS).map(([name, cols]) => (
                  <button key={name} title={name} aria-label={`${name} accent`} className={`swatch ${s.accent === name ? 'on' : ''}`} style={{ '--c': cols.dark }} onClick={() => set('accent', name)} />
                ))}
              </div>
            </div>

            <div>
              <div className="set-title">Sound</div>
              <Toggle k="sound" label="Interface sounds" hint="a distinct sound for each type of button" />
              <div className="set-row vol">
                <span>Volume<small>{s.volume}%</small></span>
                <input
                  type="range" min="0" max="100" step="5" value={s.volume} aria-label="Volume"
                  onChange={(e) => set('volume', Number(e.target.value))}
                  onPointerUp={() => sfx.play('click')}
                  onKeyUp={() => sfx.play('click')}
                />
              </div>
            </div>

            <div>
              <div className="set-title">Background</div>
              <Toggle k="rain" label="Code stream" hint="faint falling characters" />
            </div>

            <div>
              <div className="set-title">Accessibility</div>
              <Toggle k="reduceMotion" label="Reduce motion" hint="turns off animations" />
              <div className="set-title" style={{ marginTop: 14 }}>Text size</div>
              <div className="seg three">
                {['small', 'medium', 'large'].map((f) => (
                  <button key={f} className={s.fontSize === f ? 'on' : ''} onClick={() => set('fontSize', f)}>{f[0].toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            </div>

            <div>
              <button className="cbtn ghost" onClick={reset}><span>Reset all settings</span></button>
            </div>
          </div>
        </div>

        <p className="set-foot">
          The Tech Society · Cybersecurity Domain<br />
          Saveetha Engineering College<br />
          Display settings are saved on this device only.
        </p>
      </aside>
    </>
  )
}