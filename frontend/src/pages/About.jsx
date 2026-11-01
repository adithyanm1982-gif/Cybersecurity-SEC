import { useCallback, useEffect, useRef, useState } from 'react'
import Logo from '../components/Logo.jsx'
import Icon from '../components/Icons.jsx'
import { Heading, PageNav, CyberButton } from '../components/Shared.jsx'
import { useAuth } from '../auth.jsx'
import { api, memberPhotoUrl } from '../api.js'
import { sfx } from '../fx.js'
import { OK_TYPES, prepareImages } from '../imageTools.js'

// Facts checked against the official Saveetha Engineering College website (saveetha.ac.in/about-sec)
// and the official Tech Society website (techsociety.saveetha.in).
const SEC_FACTS = [
  ['Established', '2001'],
  ['Founder Chairman', 'Dr. N. M. Veeraiyan'],
  ['Status', 'Autonomous (UGC) since 2019-20'],
  ['Affiliation', 'Anna University, Chennai · approved by AICTE'],
  ['Accreditation', 'NAAC ‘A’ grade (CGPA 3.19) · NBA: 5 UG programmes'],
  ['Ranking', 'NIRF 2024, Engineering: 201-300 band'],
  ['Location', 'Saveetha Nagar, Thandalam, Chennai - 602105'],
]
const COMMUNITIES = [
  { name: 'Cyber Security', text: 'Security protocols, threat detection and professional skills.', hot: true },
  { name: 'Game & App Development', text: 'Game development and mobile app creation.' },
  { name: 'Machine Learning', text: 'Building models that learn from data to solve real problems.' },
  { name: 'Web Development', text: 'Designing and building modern websites and web applications.' },
  { name: 'Intelligent Systems', text: 'AI, smart systems and IoT for real-world automation.' },
]
const BLANK = { id: null, name: '', role: '', department: '', linkedin: '' }

// only real web links may sit behind the LinkedIn icon
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null)

export default function About() {
  const { isAdmin } = useAuth()
  const [members, setMembers] = useState(null) // null = loading
  const [online, setOnline] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, t }
  const [form, setForm] = useState(null) // the profile being added / edited (null = dialog closed)
  const [formErr, setFormErr] = useState('')
  const fileRef = useRef(null)
  const photoFor = useRef(null) // id of the profile whose photo is being changed

  const load = useCallback(async () => {
    try {
      setMembers(await api.get('/team/members'))
      setOnline(true)
    } catch {
      setMembers((m) => m || [])
      setOnline(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  // run an admin action, then reload the list
  const act = async (fn, okText) => {
    setBusy(true); setMsg(null)
    try { await fn(); await load(); setMsg({ ok: true, t: okText }); sfx.play('success'); return true }
    catch (e) { setMsg({ ok: false, t: e.message }); sfx.play('error'); return false }
    finally { setBusy(false) }
  }

  const canEdit = isAdmin && online

  // ----- photo -----
  const pickPhoto = (id) => { photoFor.current = id; fileRef.current?.click() }
  const onPhoto = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    const id = photoFor.current
    if (!file || id == null) return
    // the photo is shrunk in the browser first, so even a big phone photo uploads quickly
    act(async () => api.putFile(`/team/members/${id}/photo`, (await prepareImages([file], 700))[0]), 'Photo saved.')
  }
  const removePhoto = (m) => window.confirm('Remove this profile photo?') && act(() => api.del(`/team/members/${m.id}/photo`), 'Photo removed.')

  // ----- profile details (name, role, department, LinkedIn) -----
  const openForm = (m) => { setFormErr(''); setForm(m ? { id: m.id, name: m.name, role: m.role, department: m.department, linkedin: m.linkedin } : { ...BLANK }) }
  const onField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault()
    const link = form.linkedin.trim()
    if (link && !/^https?:\/\//i.test(link)) return setFormErr('The LinkedIn link must start with https://')
    const body = { name: form.name, role: form.role, department: form.department, linkedin: link }
    const ok = await act(
      () => (form.id ? api.put(`/team/members/${form.id}`, body) : api.post('/team/members', body)),
      form.id ? 'Profile updated.' : 'Profile added.'
    )
    if (ok) setForm(null)
  }

  // ----- delete / reorder -----
  const remove = (m) =>
    window.confirm(`Delete the profile of "${m.name || m.role || 'this person'}" completely? This cannot be undone.`) &&
    act(() => api.del(`/team/members/${m.id}`), 'Profile deleted.')
  const move = (m, direction) => act(() => api.post(`/team/members/${m.id}/move`, { direction }), 'Order updated.')

  return (
    <div className="container">
      <Heading kicker="Who we are">About Us</Heading>

      <section className="about-split">
        <article className="tile about-card">
          <Logo file="college.png" label="Saveetha Engineering College" size={110} banner trim="alpha" className="about-logo" />
          <h3>SAVEETHA ENGINEERING COLLEGE</h3>
          <div className="tags"><span>AUTONOMOUS</span><span>AFFILIATED TO ANNA UNIVERSITY</span></div>
          <p>
            Saveetha Engineering College (SEC) was established in 2001 by its Founder Chairman, Dr. N. M. Veeraiyan, and is
            managed by the Saveetha Medical and Educational Trust. Located at Thandalam, Chennai, it is an autonomous
            institution affiliated to Anna University and approved by AICTE. SEC has more than 6,400 learners in
            undergraduate, postgraduate (including MBA) and doctoral programmes, among them an undergraduate programme in
            Computer Science and Engineering (Cyber Security). It is also recognised as a Scientific and Industrial
            Research Organisation (SIRO) by the Government of India.
          </p>
          <ul className="facts">
            {SEC_FACTS.map(([k, v]) => (
              <li key={k}><span>{k}</span><b>{v}</b></li>
            ))}
          </ul>
          <div className="vm">
            <h4>Vision</h4>
            <p>To set the standard of excellence in engineering education and high-quality research in science and technology.</p>
            <h4>Mission</h4>
            <p>To promote academic excellence, widen intellectual horizons, and build self-discipline and high ideals for the total development of every individual.</p>
          </div>
        </article>

        <article className="tile about-card">
          <Logo file="techsociety.png" label="The Tech Society" size={170} invertOnLight className="about-logo ts" />
          <h3>THE TECH SOCIETY</h3>
          <div className="tags"><span>COLLABORATE</span><span>INNOVATE</span></div>
          <p>
            The Tech Society is a student-led technology community at Saveetha Engineering College. It was started in 2023
            by Mr. C. Obed Otto, Dean – ICT, together with students, and is supported by SCoFT. Created by learners, for
            learners, it gives students a platform to learn new technologies, collaborate on projects and events, solve
            real-world problems and grow both technical and soft skills, through workshops, peer-led tutorials and
            mentorship. Newcomers are welcomed and encouraged.
          </p>
          <h4 className="list-title">Tech communities</h4>
          <ul className="domains">
            {COMMUNITIES.map((c, i) => (
              <li key={c.name} className={c.hot ? 'hot' : ''}><b>0{i + 1}</b><span><strong>{c.name}</strong>{c.text}</span></li>
            ))}
          </ul>
          <p>
            Its flagship event is <strong>Hack Hustle</strong>, a 24-hour hackathon with problem statements across streams
            such as Cybersecurity and Machine Learning. The second edition, Hack Hustle 2.0, was held on 29-30 April 2026.
          </p>
          <div className="vm">
            <h4>Vision</h4>
            <p>A vibrant college tech community where diverse learners unite to explore, innovate and advance technology through collaboration, mentorship and research.</p>
            <h4>Mission</h4>
            <p>To turn raw talent into skilled coders, game creators and AI pioneers, and to solve real-world challenges with code through collaboration and innovation.</p>
          </div>
        </article>
      </section>

      <Heading kicker="The crew">Meet The Team</Heading>

      {isAdmin && !online && <div className="notice warn center">Server not reachable: editing is unavailable right now. (Free servers need about a minute to wake up: refresh the page.)</div>}
      {!isAdmin && !online && <div className="notice warn center">Team details are temporarily unavailable. Please try again shortly.</div>}
      {canEdit && <div className="notice ok center">Admin mode: use the buttons on each profile to edit details, change the photo, reorder or delete. Use “Add profile” to add a new person.</div>}
      {msg && <div className={`notice ${msg.ok ? 'ok' : 'err'} center`} role="status">{msg.t}</div>}
      <input ref={fileRef} type="file" accept={OK_TYPES.join(',')} hidden onChange={onPhoto} />

      {members === null && <p className="lead center">Loading team...</p>}

      <section className="team">
        {(members || []).map((m, i) => {
          const link = safeUrl(m.linkedin)
          return (
            <article className="tile member" key={m.id}>
              <div className="avatar">
                <div className="avatar-ring" />
                <div className="avatar-in">
                  {m.photo_token ? <img src={memberPhotoUrl(m.id, m.photo_token)} alt={m.name ? `Photo of ${m.name}` : 'Profile photo'} loading="lazy" decoding="async" /> : <Icon name="user" size={46} />}
                </div>
              </div>
              <h3 className="m-name">{m.name || <span className="m-pending">Name to be announced</span>}</h3>
              {m.role && <div className="m-role">{m.role}</div>}
              {m.department && <div className="m-dept">{m.department}</div>}
              {link && (
                <a className="linkedin" href={link} target="_blank" rel="noopener noreferrer" title="LinkedIn profile" aria-label={`LinkedIn profile of ${m.name || m.role}`}>
                  <Icon name="linkedin" size={18} />
                </a>
              )}

              {canEdit && (
                <div className="member-admin">
                  <button className="mini" disabled={busy} onClick={() => openForm(m)}><Icon name="edit" size={13} /> Edit details</button>
                  <button className="mini" disabled={busy} onClick={() => pickPhoto(m.id)}><Icon name="upload" size={13} /> {m.photo_token ? 'Replace photo' : 'Upload photo'}</button>
                  {m.photo_token && <button className="mini" disabled={busy} onClick={() => removePhoto(m)}><Icon name="image" size={13} /> Remove photo</button>}
                  <div className="member-order">
                    <button className="mini" disabled={busy || i === 0} onClick={() => move(m, 'up')} aria-label="Move earlier"><Icon name="chevron-left" size={14} /></button>
                    <button className="mini" disabled={busy || i === members.length - 1} onClick={() => move(m, 'down')} aria-label="Move later"><Icon name="chevron-right" size={14} /></button>
                    <button className="mini danger" disabled={busy} onClick={() => remove(m)}><Icon name="trash" size={13} /> Delete profile</button>
                  </div>
                </div>
              )}
            </article>
          )
        })}

        {canEdit && (
          <button className="member-add" disabled={busy} onClick={() => openForm(null)}>
            <Icon name="plus" size={26} />
            <span>Add profile</span>
          </button>
        )}
      </section>

      {members && online && members.length === 0 && !isAdmin && <p className="lead center">No team profiles have been published yet.</p>}

      {/* add / edit dialog */}
      {form && (
        <div className="modal-back" onClick={() => setForm(null)}>
          <form className="modal form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{form.id ? 'Edit profile' : 'Add profile'}</h3>
            <label>Name<input autoFocus maxLength={120} value={form.name} onChange={onField('name')} placeholder="Full name" /></label>
            <label>Role<input maxLength={120} value={form.role} onChange={onField('role')} placeholder="e.g. Student Coordinator" /></label>
            <label>Department<input maxLength={120} value={form.department} onChange={onField('department')} placeholder="e.g. Computer Science and Engineering" /></label>
            <label>LinkedIn link (optional)<input maxLength={300} value={form.linkedin} onChange={onField('linkedin')} placeholder="https://www.linkedin.com/in/..." inputMode="url" /></label>
            {formErr && <div className="notice err" role="alert">{formErr}</div>}
            <div className="modal-actions">
              <CyberButton variant="ghost" onClick={() => setForm(null)}>Cancel</CyberButton>
              <CyberButton type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save'}</CyberButton>
            </div>
            {!form.id && <p className="hint">You can upload the photo right after adding the profile.</p>}
          </form>
        </div>
      )}

      <PageNav />
    </div>
  )
}