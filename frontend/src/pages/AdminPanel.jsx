import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Heading, CyberButton, BackBar } from '../components/Shared.jsx'
import Icon from '../components/Icons.jsx'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '')

function Table({ cols, rows, empty }) {
  if (!rows.length) return <div className="notice">{empty}</div>
  return (
    <div className="table-wrap">
      <table className="ctable">
        <thead><tr>{cols.map((c) => <th key={c.k}>{c.h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>{cols.map((c) => <td key={c.k}>{c.f ? c.f(r[c.k]) : r[c.k]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FORM_COLS = [
  { k: 'id', h: '#' }, { k: 'submitted_at', h: 'SUBMITTED' }, { k: 'name', h: 'NAME' }, { k: 'register_no', h: 'REG NO' },
  { k: 'department', h: 'DEPT' }, { k: 'year', h: 'YEAR' }, { k: 'email', h: 'EMAIL' }, { k: 'phone', h: 'PHONE' }, { k: 'reason', h: 'WHY JOIN' },
]
const USER_COLS = [
  { k: 'id', h: '#' }, { k: 'name', h: 'NAME' }, { k: 'email', h: 'GOOGLE EMAIL' }, { k: 'role', h: 'ROLE' },
  { k: 'created_at', h: 'SIGNED UP', f: fmt }, { k: 'last_login', h: 'LAST LOGIN', f: fmt },
]

export default function AdminPanel() {
  const { user, loading, isAdmin } = useAuth()
  const [tab, setTab] = useState('forms')
  const [forms, setForms] = useState([])
  const [users, setUsers] = useState([])
  const [folders, setFolders] = useState(0)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setErr('')
    try {
      const [a, u, e] = await Promise.all([api.get('/admin/applications'), api.get('/admin/users'), api.get('/events')])
      setForms(a); setUsers(u); setFolders(e.length)
    } catch (e) { setErr(e.message) }
  }, [])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  if (loading) return <div className="container"><p className="lead center">LOADING...</p></div>
  // not signed in -> login page; signed in but NOT an admin -> home (this also avoids a redirect loop)
  if (!user) return <Navigate to="/login" state={{ from: '/admin', mode: 'login' }} replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="container">
      <Heading kicker={`Signed in as ${user.email}`}>Admin Console</Heading>

      <div className="stats">
        <div className="tile stat"><b>{forms.length}</b><span>FORMS IN THE CSV</span></div>
        <div className="tile stat"><b>{users.length}</b><span>GOOGLE ACCOUNTS</span></div>
        <div className="tile stat"><b>{users.filter((u) => u.role === 'admin').length}</b><span>ADMINS SIGNED IN</span></div>
        <div className="tile stat"><b>{folders}</b><span>EVENT FOLDERS</span></div>
      </div>

      <div className="auth-tabs">
        <button className={`cbtn ${tab === 'forms' ? '' : 'ghost'}`} onClick={() => setTab('forms')}><span>Submitted forms</span></button>
        <button className={`cbtn ${tab === 'users' ? '' : 'ghost'}`} onClick={() => setTab('users')}><span>Accounts</span></button>
        <CyberButton variant="ghost" to="/events">Manage event gallery</CyberButton>
      </div>

      {err && <div className="notice err">{err}</div>}

      {tab === 'forms' && (
        <>
          <div className="btn-row" style={{ marginTop: 0, marginBottom: 16 }}>
            <CyberButton onClick={() => api.download('/admin/applications.csv', 'applications.csv').catch((e) => setErr(e.message))}><Icon name="download" size={16} />Download CSV</CyberButton>
            <CyberButton variant="ghost" onClick={load}><Icon name="refresh" size={16} />Refresh</CyberButton>
          </div>
          <Table cols={FORM_COLS} rows={forms} empty="No forms submitted yet. The CSV file only has its header row." />
        </>
      )}
      {tab === 'users' && <Table cols={USER_COLS} rows={users} empty="Nobody has signed in yet." />}

      <BackBar />
    </div>
  )
}