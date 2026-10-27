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
  const loc = useLocation()
  const from = loc.state?.from // where to go after signing in (e.g. the JOIN page)
  const [mode, setMode] = useState(loc.state?.mode === 'signup' ? 'signup' : 'login') // same Google flow, different wording
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
      <Heading kicker="IDENTIFY YOURSELF">{mode === 'signup' ? 'Create Account' : 'Login'}</Heading>

      <div className="auth-tabs">
        <button className={`cbtn ${mode === 'login' ? '' : 'ghost'}`} onClick={() => setMode('login')}><span>LOGIN</span></button>
        <button className={`cbtn ${mode === 'signup' ? '' : 'ghost'}`} onClick={() => setMode('signup')}><span>CREATE ACCOUNT</span></button>
      </div>

      {!API_CONFIGURED && (
        <div className="notice warn">Backend address missing: set <code>VITE_API_URL</code> in the frontend environment variables.</div>
      )}

      <div className="tile auth-card reveal in">
        <div className="google-box">
          <div className="big-ico">🔐</div>
          <h3>{mode === 'signup' ? 'CREATE YOUR ACCOUNT WITH GOOGLE' : 'LOGIN WITH GOOGLE'}</h3>
          <p className="auth-note">
            {mode === 'signup'
              ? 'Pick your Google account below and your account is created on the spot.'
              : 'Pick your Google account below. If this is your first time, an account is created automatically.'}
            {' '}We only receive your name and e-mail address, never your Google password.
          </p>

          {GOOGLE_ID ? (
            <div className={busy ? 'g-busy' : ''}>
              <GoogleLogin
                key={mode}
                theme="filled_black"
                shape="rectangular"
                size="large"
                text={mode === 'signup' ? 'signup_with' : 'signin_with'}
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