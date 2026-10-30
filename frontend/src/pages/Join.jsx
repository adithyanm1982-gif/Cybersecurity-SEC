import { useEffect, useState } from 'react'
import { Heading, PageNav, CyberButton } from '../components/Shared.jsx'
import Icon from '../components/Icons.jsx'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { sfx } from '../fx.js'

const EMPTY = { name: '', register_no: '', department: '', year: '', phone: '', reason: '' }

export default function Join() {
  const { user, loading } = useAuth()
  const [f, setF] = useState(EMPTY)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // pre-fill the name from the Google account
  useEffect(() => {
    if (user?.name) setF((p) => ({ ...p, name: p.name || user.name }))
  }, [user])

  const on = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      await api.post('/applications', f) // one new line is added to the CSV file in the database
      setSent(true)
      sfx.play('success')
    } catch (er) {
      setErr(er.message)
      sfx.play('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container narrow">
      <Heading kicker="Recruitment">Join The Domain</Heading>

      {loading && <p className="lead center">Checking your session...</p>}

      {/* step 1: must be signed in with Google */}
      {!loading && !user && (
        <div className="tile success reveal in">
          <div className="big"><Icon name="lock" size={30} /></div>
          <h3>Sign in first</h3>
          <p>Please sign in with Google before filling the form. It verifies your e-mail address and takes one click.</p>
          <CyberButton to="/login" state={{ from: '/join' }}>Sign in with Google</CyberButton>
        </div>
      )}

      {/* step 2: the form */}
      {!loading && user && !sent && (
        <form className="tile form reveal in" onSubmit={submit}>
          <p className="hint">Signed in as <b>{user.email}</b>. This e-mail is saved with your form.</p>
          <label>Name<input required minLength={2} maxLength={120} value={f.name} onChange={on('name')} placeholder="Your full name" /></label>
          <label>Register number<input required minLength={3} maxLength={40} value={f.register_no} onChange={on('register_no')} placeholder="e.g. 2117xxxxxx" /></label>
          <div className="row2">
            <label>Department<input required minLength={2} maxLength={80} value={f.department} onChange={on('department')} placeholder="e.g. CSE" /></label>
            <label>Year
              <select required value={f.year} onChange={on('year')}>
                <option value="" disabled>Select</option>
                <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
              </select>
            </label>
          </div>
          <label>Phone (optional)<input maxLength={20} value={f.phone} onChange={on('phone')} placeholder="+91 ..." /></label>
          <label>Why do you want to join?<textarea rows="4" maxLength={2000} value={f.reason} onChange={on('reason')} placeholder="Tell us about your interest in cybersecurity..." /></label>
          {err && <div className="notice err" role="alert">{err}</div>}
          <CyberButton type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit application'}</CyberButton>
          {busy && <div className="progress"><i /></div>}
        </form>
      )}

      {!loading && user && sent && (
        <div className="tile success reveal in">
          <div className="big"><Icon name="check" size={30} /></div>
          <h3>Application received</h3>
          <p>Your details have been saved. We will contact you at <b>{user.email}</b>.</p>
          <CyberButton onClick={() => { setSent(false); setF({ ...EMPTY, name: user.name || '' }) }} variant="ghost">Submit another</CyberButton>
        </div>
      )}

      <PageNav />
    </div>
  )
}