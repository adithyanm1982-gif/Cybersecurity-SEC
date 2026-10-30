import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from './Navbar.jsx'
import Logo from './Logo.jsx'
import Icon from './Icons.jsx'

// variant: '' (primary) | 'ghost' (secondary) | 'danger'
export function CyberButton({ to, onClick, children, variant = '', type = 'button', ...rest }) {
  const cls = `cbtn ${variant}`
  if (to) return <Link to={to} className={cls} {...rest}><span>{children}</span></Link>
  return <button type={type} className={cls} onClick={onClick} {...rest}><span>{children}</span></button>
}

export function Heading({ kicker, children }) {
  return (
    <div className="heading reveal">
      {kicker && <div className="kicker">{kicker}</div>}
      <h2>{children}</h2>
      <div className="h-line"><i /></div>
    </div>
  )
}

// BACK / NEXT page navigation
export function PageNav() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const i = Math.max(0, ROUTES.findIndex((r) => r.to === pathname))
  const prev = ROUTES[i - 1], next = ROUTES[i + 1]
  return (
    <div className="pagenav">
      <button className="cbtn ghost" disabled={!prev} onClick={() => prev && nav(prev.to)}>
        <span><Icon name="arrow-left" size={16} />{prev ? prev.label : 'Back'}</span>
      </button>
      <button className="cbtn" disabled={!next} onClick={() => next && nav(next.to)}>
        <span>{next ? next.label : 'End'}<Icon name="arrow-right" size={16} /></span>
      </button>
    </div>
  )
}

// BACK button for pages that are not in the main menu (login, admin)
export function BackBar({ to = '/' }) {
  const nav = useNavigate()
  return (
    <div className="pagenav">
      <button className="cbtn ghost" onClick={() => nav(to)}><span><Icon name="arrow-left" size={16} />Back to home</span></button>
    </div>
  )
}

export function LogoStrip() {
  return (
    <div className="logo-strip">
      <Logo file="college.png" label="Saveetha Engineering College" size={130} banner trim="alpha" />
      <Logo file="25years.png" label="25 Years of Excellence" size={78} round />
      <Logo file="aifirst.png" label="AI First Campus" size={66} plate trim />
    </div>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-row">
        <span>© 2026 The Tech Society · Cybersecurity Domain</span>
        <span>Saveetha Engineering College · Autonomous · Affiliated to Anna University</span>
      </div>
    </footer>
  )
}