import { NavLink, Link, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import Icon from './Icons.jsx'
import Avatar from './Avatar.jsx'
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
//   row 1: brand  |  college logos  |  PROFILE button + SETTINGS button
//   row 2: the page links (HOME ... CONTACTS, and ADMIN only for an admin)
export default function Navbar({ onSettings }) {
  const { user, isAdmin } = useAuth()
  const nav = useNavigate()

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <Logo file="techsociety.png" label="Tech Society" size={52} invertOnLight className="brand-logo" />
        <div className="brand-text">
          <span>TECH SOCIETY</span>
          <small>Cybersecurity Domain</small>
        </div>
      </Link>

      <div className="head-logos">
        <Logo file="college.png" label="Saveetha Engineering College" size={46} banner trim="alpha" />
        <Logo file="25years.png" label="25 Years of Excellence" size={36} round />
        <Logo file="aifirst.png" label="AI First Campus" size={36} plate trim />
      </div>

      <div className="top-actions">
        {/* PROFILE button: Google photo + name when signed in, LOGIN when a guest */}
        {user ? (
          <button className="auth-chip profile-btn" title={user.email} aria-label="Profile and account" onClick={onSettings}>
            <Avatar user={user} size={30} className="nav-avatar" />
            <span className={`role-badge ${isAdmin ? 'admin' : ''}`}>{isAdmin ? 'Admin' : 'Member'}</span>
            <span className="auth-name">{(user.name || user.email).split(' ')[0]}</span>
          </button>
        ) : (
          <button className="auth-chip profile-btn" aria-label="Login" onClick={() => nav('/login', { state: { mode: 'login' } })}>
            <span className="auth-name guest-login">LOGIN</span>
          </button>
        )}

        {/* SETTINGS button: account actions + dark / light mode */}
        <button className="icon-btn" title="Settings" aria-label="Settings" onClick={onSettings}><Icon name="gear" size={19} /></button>
      </div>

      <nav className="nav" aria-label="Main">
        {ROUTES.map((r) => (
          <NavLink key={r.to} to={r.to} end={r.to === '/'}>{r.label}</NavLink>
        ))}
        {/* the ADMIN page exists ONLY for the admin login */}
        {isAdmin && <NavLink to="/admin" className="nav-admin">ADMIN</NavLink>}
      </nav>
    </header>
  )
}