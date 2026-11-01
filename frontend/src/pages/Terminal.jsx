import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading, PageNav, CyberButton } from '../components/Shared.jsx'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import '../terminal.css'

const HELP = [
  ['head', 'Available commands'],
  ['out', '  recon <site>   basic public info about a site   e.g. recon example.com'],
  ['out', '  whoami         show who you are logged in as'],
  ['out', '  clear          clear the screen'],
  ['out', '  help           show this list'],
  ['dim', 'RECON is for members and admins only. It sends one normal page request, nothing more.'],
]

function formatRecon(d) {
  const L = []
  L.push(['head', `RECON REPORT: ${d.target}`])
  L.push(['out', `IP address(es) : ${d.ips.join(', ')}`])
  L.push([d.status < 400 ? 'ok' : 'warn', `HTTP status     : ${d.status} ${d.reason || ''}`])
  L.push(['out', `Final URL       : ${d.final_url}`])
  if (d.redirects.length) L.push(['out', `Redirects       : ${d.redirects.join('  |  ')}`])
  L.push(['out', `Page title      : ${d.title || '(none found)'}`])
  L.push(['out', `Server          : ${d.server || '(not disclosed)'}`])
  if (d.powered_by) L.push(['out', `Powered by      : ${d.powered_by}`])
  L.push(['out', `Content type    : ${d.content_type || '(unknown)'}`])

  L.push(['head', 'TLS CERTIFICATE'])
  if (!d.tls) {
    L.push(['warn', 'Site answered over plain HTTP (no HTTPS).'])
  } else if (!d.tls.valid) {
    L.push(['err', `Certificate NOT trusted: ${d.tls.error}`])
    L.push(['out', `Protocol        : ${d.tls.version}`])
  } else {
    L.push(['ok', 'Certificate is valid and trusted'])
    L.push(['out', `Issuer          : ${d.tls.issuer}`])
    if (d.tls.expires) {
      const soon = d.tls.days_left < 15
      L.push([soon ? 'warn' : 'out', `Expires         : ${d.tls.expires} (${d.tls.days_left} days left)`])
    }
    L.push(['out', `Protocol        : ${d.tls.version}`])
  }

  L.push(['head', 'SECURITY HEADERS'])
  d.security_headers.present.forEach((h) => L.push(['ok', `  [+] ${h}`]))
  d.security_headers.missing.forEach((h) => L.push(['warn', `  [-] ${h} (missing)`]))
  L.push(['dim', `Done in ${d.elapsed_ms} ms`])
  return L
}

export default function Terminal() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [lines, setLines] = useState([
    ['head', 'TECH SOCIETY SHELL v1.0'],
    ['dim', "Type 'help' to see the commands."],
  ])
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [needLogin, setNeedLogin] = useState(false)
  const hist = useRef([])
  const hIdx = useRef(-1)
  const endRef = useRef(null)
  const inRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [lines, needLogin])

  const add = (...rows) => setLines((p) => [...p, ...rows])

  const goLogin = () => nav('/login', { state: { mode: 'login', from: '/terminal' } })

  async function run(raw) {
    const text = raw.trim()
    add(['cmd', `$ ${text}`])
    if (!text) return
    hist.current.push(text)
    hIdx.current = hist.current.length

    const [cmd, ...rest] = text.split(/\s+/)
    const arg = rest.join(' ')
    switch (cmd.toLowerCase()) {
      case 'help': return add(...HELP)
      case 'clear': return setLines([])
      case 'whoami':
        return add(user ? ['ok', `${user.name || 'Member'} <${user.email}> [${user.role === 'admin' ? 'admin' : 'member'}]`] : ['warn', 'guest (not logged in)'])
      case 'recon': {
        if (!user) {
          setNeedLogin(true)
          return add(['err', 'ACCESS DENIED: RECON is only for logged-in members and admins.'], ['warn', 'Please log in to use it.'])
        }
        if (!arg) return add(['warn', 'Usage: recon <site>   e.g. recon example.com'])
        setBusy(true)
        add(['dim', `Looking up ${arg} ...`])
        try {
          const d = await api.post('/recon', { target: arg })
          add(...formatRecon(d))
        } catch (e) {
          if (e.status === 401) {
            setNeedLogin(true)
            add(['err', 'Your session has ended. Please log in again.'])
          } else if (e.status === 429) {
            add(['warn', e.message])
          } else {
            add(['err', `Error: ${e.message}`])
          }
        } finally {
          setBusy(false)
          setTimeout(() => inRef.current?.focus(), 0)
        }
        return
      }
      default:
        return add(['err', `command not found: ${cmd}`], ['dim', "Type 'help' to see the commands."])
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !busy) {
      const v = val
      setVal('')
      run(v)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (hist.current.length) {
        hIdx.current = Math.max(0, hIdx.current - 1)
        setVal(hist.current[hIdx.current] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      hIdx.current = Math.min(hist.current.length, hIdx.current + 1)
      setVal(hist.current[hIdx.current] || '')
    }
  }

  return (
    <div className="container narrow" style={{ maxWidth: 1040 }}>
      <Heading kicker="SHELL ACCESS">Terminal</Heading>

      <div className="term" onClick={() => inRef.current?.focus()}>
        <div className="term-bar"><i /> TECH-SOCIETY · RECON SHELL</div>
        <div className="term-out" role="log" aria-live="polite">
          {lines.map(([t, s], i) => <div key={i} className={`term-line ${t}`}>{s}</div>)}
          {needLogin && !user && (
            <div className="term-login">
              <CyberButton onClick={goLogin}>Login to use RECON</CyberButton>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="term-in">
          <span className="ps">{user ? `${(user.name || 'member').split(' ')[0].toLowerCase()}@techsociety` : 'guest@techsociety'}:~$</span>
          <input
            ref={inRef}
            value={val}
            disabled={busy}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKey}
            placeholder={busy ? 'working...' : 'recon example.com'}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Terminal command"
          />
        </div>
      </div>

      <p className="term-hint">
        RECON gives only basic public information (IP, status, server, title, certificate, security headers).
        It makes one normal page request and never scans ports or sends attack data. Use it only on sites you are allowed to look at.
        {!user && ' Guests must log in first.'}
      </p>

      <PageNav />
    </div>
  )
}