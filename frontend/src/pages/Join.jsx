import { useEffect, useState } from 'react'
import { Heading, PageNav, CyberButton } from '../components/Shared.jsx'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'

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
    } catch (er) {
      setErr(er.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container narrow">
      <Heading kicker="RECRUITMENT">Join The Domain</Heading>

      {loading && <p className="lead center">CHECKING SESSION...</p>}

      {/* step 1: must be signed in with Google */}
      {!loading && !user && (
        <div className="tile success reveal in">
          <div className="big">🔐</div>
          <h3>SIGN IN FIRST</h3>
          <p>Please sign in with Google before filling the form. It proves your e-mail address and takes one click.</p>
          <CyberButton to="/login" state={{ from: '/join' }}>SIGN IN WITH GOOGLE</CyberButton>
        </div>
      )}

      {/* step 2: the form */}
      {!loading && user && !sent && (
        <form className="tile form reveal in" onSubmit={submit}>
          <p className="hint">Signed in as <b>{user.email}</b>. This e-mail is saved with your form.</p>
          <label>NAME<input required minLength={2} maxLength={120} value={f.name} onChange={on('name')} placeholder="Your full name" /></label>
          <label>REGISTER NUMBER<input required minLength={3} maxLength={40} value={f.register_no} onChange={on('register_no')} placeholder="e.g. 2117xxxxxx" /></label>
          <div className="row2">
            <label>DEPARTMENT<input required minLength={2} maxLength={80} value={f.department} onChange={on('department')} placeholder="e.g. CSE" /></label>
            <label>YEAR
              <select required value={f.year} onChange={on('year')}>
                <option value="" disabled>Select</option>
                <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
              </select>
            </label>
          </div>
          <label>PHONE (OPTIONAL)<input maxLength={20} value={f.phone} onChange={on('phone')} placeholder="+91 ..." /></label>
          <label>WHY DO YOU WANT TO JOIN?<textarea rows="4" maxLength={2000} value={f.reason} onChange={on('reason')} placeholder="Tell us about your interest in cybersecurity..." /></label>
          {err && <div className="notice err" role="alert">⚠ {err}</div>}
          <CyberButton type="submit" disabled={busy}>{busy ? 'ENCRYPTING & SENDING...' : 'SUBMIT APPLICATION'}</CyberButton>
          {busy && <div className="progress"><i /></div>}
        </form>
      )}

      {!loading && user && sent && (
        <div className="tile success reveal in">
          <div className="big">✔</div>
          <h3 className="glitch" data-text="ACCESS REQUESTED">ACCESS REQUESTED</h3>
          <p>Your details have been saved. We will contact you at <b>{user.email}</b>.</p>
          <CyberButton onClick={() => { setSent(false); setF({ ...EMPTY, name: user.name || '' }) }} variant="ghost">SUBMIT ANOTHER</CyberButton>
        </div>
      )}

      <PageNav />
    </div>
  )
}
