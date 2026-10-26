import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { Heading } from '../components/Shared.jsx'
import { useAuth } from '../auth.jsx'
import { API_CONFIGURED } from '../api.js'

const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Login() {
  const { user, google } = useAuth()
  const nav = useNavigate()
  const from = useLocation().state?.from // where to go after signing in (e.g. the JOIN page)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (user) return <Navigate to={from || (user.role === 'admin' ? '/admin' : '/')} replace />

  const onSuccess = async (res) => {
    if (!res.credential) return setErr('Google did not return a sign-in token. Please try again.')
    setErr(''); setBusy(true)
    try { await google(res.credential) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="container narrow">
      <Heading kicker="IDENTIFY YOURSELF">Sign In / Sign Up</Heading>

      {!API_CONFIGURED && (
        <div className="notice warn">Backend address missing: set <code>VITE_API_URL</code> in the frontend environment variables.</div>
      )}

      <div className="tile auth-card reveal in">
        <div className="google-box">
          <div className="big-ico">🔐</div>
          <h3>CONTINUE WITH GOOGLE</h3>
          <p className="auth-note">
            One button for both. If this is your first time, your account is created automatically.
            We only receive your name and e-mail address, never your Google password.
          </p>

          {GOOGLE_ID ? (
            <div className={busy ? 'g-busy' : ''}>
              <GoogleLogin
                theme="filled_black"
                shape="rectangular"
                size="large"
                text="continue_with"
                onSuccess={onSuccess}
                onError={() => setErr('Google sign-in failed or was cancelled.')}
              />
            </div>
          ) : (
            <div className="notice warn">Google login is not set up yet: add <code>VITE_GOOGLE_CLIENT_ID</code> to the frontend environment variables.</div>
          )}

          {busy && <div className="progress"><i /></div>}
          {err && <div className="notice err" role="alert">⚠ {err}</div>}
        </div>
      </div>

      <div className="pagenav">
        <button className="cbtn ghost" onClick={() => nav(-1)}><span>« BACK</span></button>
        <button className="cbtn" onClick={() => nav('/')}><span>HOME »</span></button>
      </div>
    </div>
  )
}
