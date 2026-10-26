import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useSettings } from '../settings.jsx'
import { useAuth } from '../auth.jsx'

export const ROUTES = [
  { to: '/', label: 'HOME' },
  { to: '/about', label: 'ABOUT' },
  { to: '/events', label: 'EVENTS' },
  { to: '/resources', label: 'RESOURCES' },
  { to: '/join', label: 'JOIN' },
  { to: '/terminal', label: 'TERMINAL' },
  { to: '/contacts', label: 'CONTACTS' },
]

export default function Navbar({ onSettings }) {
  const [open, setOpen] = useState(false)
  const { s, set } = useSettings()
  const { user, isAdmin, logout } = useAuth()
  const nav = useNavigate()
  const close = () => setOpen(false)

  return (
    <header className="topbar">
      <Link to="/" className="brand" onClick={close}>
        <Logo file="techsociety.png" label="Tech Society" size={64} invertOnLight className="brand-logo" />
        <div className="brand-text">
          <span className="glitch" data-text="TECH SOCIETY">TECH SOCIETY</span>
          <small>// CYBERSECURITY DOMAIN</small>
        </div>
      </Link>

      <div className="head-logos">
        <Logo file="college.png" label="Saveetha Engineering College" size={54} banner trim="alpha" />
        <Logo file="25years.png" label="25 Years of Excellence" size={38} round />
        <Logo file="aifirst.png" label="AI First Campus" size={38} plate trim />
      </div>

      <nav className={`nav ${open ? 'open' : ''}`}>
        {ROUTES.map((r) => (
          <NavLink key={r.to} to={r.to} end={r.to === '/'} onClick={close}>
            <span>{r.label}</span>
          </NavLink>
        ))}
        {isAdmin && <NavLink to="/admin" onClick={close}><span>ADMIN</span></NavLink>}
      </nav>

      <div className="top-actions">
        {user ? (
          <div className="auth-chip" title={user.email}>
            <span className={`role-badge ${isAdmin ? 'admin' : ''}`}>{isAdmin ? 'ADMIN' : 'USER'}</span>
            <span className="auth-name">{(user.name || user.email).split(' ')[0]}</span>
            <button className="auth-out" onClick={() => { logout(); close(); nav('/') }} title="Log out">⏻</button>
          </div>
        ) : (
          <Link to="/login" className="cbtn small" onClick={close}><span>LOGIN</span></Link>
        )}
        <button className="icon-btn" title="Toggle dark / light" onClick={() => set('theme', s.theme === 'dark' ? 'light' : 'dark')}>
          {s.theme === 'dark' ? '☾' : '☀'}
        </button>
        <button className="icon-btn" title="Settings" onClick={onSettings}>⚙</button>
        <button className="icon-btn burger" onClick={() => setOpen((o) => !o)} title="Menu">{open ? '✕' : '☰'}</button>
      </div>
    </header>
  )
}
