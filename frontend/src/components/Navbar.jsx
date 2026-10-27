import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
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

// Header layout
//   row 1: brand  |  college logos  |  account chip + settings (+ burger on phones)
//   row 2: the page links (HOME ... CONTACTS, and ADMIN only for an admin)
// Login / sign-up / theme / effects now live inside the SETTINGS panel (the gear button).
export default function Navbar({ onSettings }) {
  const [open, setOpen] = useState(false)
  const { user, isAdmin, logout } = useAuth()
  const nav = useNavigate()
  const close = () => setOpen(false)

  return (
    <header className="topbar">
      <Link to="/" className="brand" onClick={close}>
        <Logo file="techsociety.png" label="Tech Society" size={56} invertOnLight className="brand-logo" />
        <div className="brand-text">
          <span className="glitch" data-text="TECH SOCIETY">TECH SOCIETY</span>
          <small>// CYBERSECURITY DOMAIN</small>
        </div>
      </Link>

      <div className="head-logos">
        <Logo file="college.png" label="Saveetha Engineering College" size={48} banner trim="alpha" />
        <Logo file="25years.png" label="25 Years of Excellence" size={36} round />
        <Logo file="aifirst.png" label="AI First Campus" size={36} plate trim />
      </div>

      <div className="top-actions">
        {user && (
          <div className="auth-chip" title={user.email}>
            <span className={`role-badge ${isAdmin ? 'admin' : ''}`}>{isAdmin ? 'ADMIN' : 'USER'}</span>
            <span className="auth-name">{(user.name || user.email).split(' ')[0]}</span>
            <button className="auth-out" onClick={() => { logout(); close(); nav('/') }} title="Log out" aria-label="Log out">⏻</button>
          </div>
        )}
        <button className="icon-btn" title="Settings" aria-label="Settings" onClick={() => { close(); onSettings() }}>⚙</button>
        <button className="icon-btn burger" onClick={() => setOpen((o) => !o)} title="Menu" aria-label="Menu" aria-expanded={open}>{open ? '✕' : '☰'}</button>
      </div>

      <nav className={`nav ${open ? 'open' : ''}`} aria-label="Main">
        {ROUTES.map((r) => (
          <NavLink key={r.to} to={r.to} end={r.to === '/'} onClick={close}>
            <span>{r.label}</span>
          </NavLink>
        ))}
        {/* the ADMIN page exists ONLY for the admin login */}
        {isAdmin && <NavLink to="/admin" className="nav-admin" onClick={close}><span>ADMIN</span></NavLink>}
      </nav>
    </header>
  )
}