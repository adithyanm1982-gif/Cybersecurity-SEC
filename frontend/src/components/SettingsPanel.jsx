import { useNavigate } from 'react-router-dom'
import { useSettings } from '../settings.jsx'
import { useAuth } from '../auth.jsx'
import Icon from './Icons.jsx'
import Avatar from './Avatar.jsx'

export default function SettingsPanel({ open, onClose }) {
  const { s, set } = useSettings()
  const { user, isAdmin, logout } = useAuth()
  const nav = useNavigate()

  const go = (path, state) => { onClose(); nav(path, state ? { state } : undefined) }

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`settings ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="settings-head">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings"><Icon name="close" size={18} /></button>
        </div>

        {/* ---------- ACCOUNT: login / sign up / logout ---------- */}
        <section className="acct">
          <div className="set-title">Account</div>
          {user ? (
            <>
              <div className="acct-card">
                <Avatar user={user} size={42} />
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
                <button className="cbtn ghost" onClick={() => go('/login', { mode: 'signup' })}><span>Sign up</span></button>
              </div>
              <p className="set-foot">Sign-in uses your Google account. Your first sign-in creates the account automatically.</p>
            </>
          )}
        </section>

        {/* ---------- DISPLAY MODE: dark / light ---------- */}
        <section>
          <div className="set-title">Display mode</div>
          <div className="seg">
            <button className={s.theme === 'dark' ? 'on' : ''} onClick={() => set('theme', 'dark')}><Icon name="moon" size={15} /> Dark</button>
            <button className={s.theme === 'light' ? 'on' : ''} onClick={() => set('theme', 'light')}><Icon name="sun" size={15} /> Light</button>
          </div>
        </section>

        <p className="set-foot">
          The Tech Society · Cybersecurity Domain<br />
          Saveetha Engineering College<br />
          Display mode is saved on this device only.
        </p>
      </aside>
    </>
  )
}