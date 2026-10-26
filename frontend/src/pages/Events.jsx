import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heading, PageNav, CyberButton } from '../components/Shared.jsx'
import { useAuth } from '../auth.jsx'
import { api, imgUrl } from '../api.js'

const MAX_MB = 5
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// ---------- SAMPLE images (shown until the admin uploads real ones) ----------
const sample = (seed, n) => `https://picsum.photos/seed/${seed}/${n}/${n}`
const samplePhotos = (i) =>
  Array.from({ length: 3 + (i % 2) }, (_, j) => ({
    id: null,
    url: sample(`cyber-ev${i + 1}-p${j + 1}`, 700),
    full: sample(`cyber-ev${i + 1}-p${j + 1}`, 1100),
  }))

// turn the API answer into what the page needs; empty folders get sample images
function normalize(list) {
  return list.map((e, i) => {
    const real = e.images.map((im) => ({ id: im.id, url: imgUrl(im.id), full: imgUrl(im.id) }))
    return {
      id: e.id,
      name: e.name,
      coverId: e.cover_image_id,
      cover: e.cover_image_id ? imgUrl(e.cover_image_id) : real[0]?.url || sample(`cyber-cover-${i + 1}`, 600),
      photos: real.length ? real : samplePhotos(i),
      isSample: real.length === 0,
    }
  })
}

// shown when the server cannot be reached
const OFFLINE = Array.from({ length: 9 }, (_, i) => ({
  id: null, name: 'EEE', coverId: null, cover: sample(`cyber-cover-${i + 1}`, 600), photos: samplePhotos(i), isSample: true,
}))

export default function Events() {
  const { isAdmin, user } = useAuth()
  const [events, setEvents] = useState(null)
  const [offline, setOffline] = useState(false)
  const [open, setOpen] = useState(null)
  const [light, setLight] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // {ok, t}
  const [rename, setRename] = useState('')
  const fileRef = useRef(null)

  const refresh = useCallback(async () => {
    try {
      setEvents(normalize(await api.get('/events')))
      setOffline(false)
    } catch {
      setEvents(OFFLINE)
      setOffline(true)
    }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const ev = events && open !== null ? events[open] : null
  useEffect(() => { if (ev) setRename(ev.name) }, [ev?.id, ev?.name]) // eslint-disable-line

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') light !== null ? setLight(null) : setOpen(null)
      if (light !== null && ev) {
        if (e.key === 'ArrowRight') setLight((l) => (l + 1) % ev.photos.length)
        if (e.key === 'ArrowLeft') setLight((l) => (l - 1 + ev.photos.length) % ev.photos.length)
      }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [light, ev])

  const go = (i) => { setLight(null); setMsg(null); setOpen(i); window.scrollTo({ top: 0 }) }
  const canEdit = isAdmin && !offline && ev && ev.id !== null

  // run an admin action, then reload from the server
  const act = async (fn, okText) => {
    setBusy(true); setMsg(null)
    try { await fn(); await refresh(); setMsg({ ok: true, t: okText }) }
    catch (e) { setMsg({ ok: false, t: e.message }) }
    finally { setBusy(false) }
  }

  const onPick = (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    const bad = files.find((f) => !OK_TYPES.includes(f.type) || f.size > MAX_MB * 1024 * 1024)
    if (bad) return setMsg({ ok: false, t: `"${bad.name}": only JPG, PNG, WEBP or GIF up to ${MAX_MB} MB.` })
    act(() => api.upload(`/events/${ev.id}/images`, files), `${files.length} photo(s) uploaded to the server.`)
  }

  const photoId = (p) => p.id !== null

  return (
    <div className="container">
      {!events && <p className="lead center">LOADING ARCHIVE...</p>}

      {events && !ev && (
        <>
          <Heading kicker="MEMORY ARCHIVE">Events Gallery</Heading>
          <p className="lead center reveal">Open a folder to browse the photos of past Cybersecurity domain events.</p>
          {offline && <div className="notice warn center">Server not reachable: showing sample data. (Free servers need ~1 minute to wake up: refresh the page.)</div>}
          {isAdmin && !offline && <div className="notice ok center">ADMIN MODE: open a folder to upload, delete or rename.</div>}
          {!user && <p className="hint center">Admin? <Link to="/login">Log in</Link> to upload photos.</p>}
          <section className="folders">
            {events.map((e, i) => (
              <button className="folder reveal" key={e.id ?? i} onClick={() => go(i)} style={{ transitionDelay: `${i * 50}ms` }}>
                <div className="folder-tab"><span>DIR_{String(i + 1).padStart(2, '0')}</span></div>
                <div className="folder-body">
                  <img src={e.cover} alt={`${e.name} cover`} loading="lazy" />
                  <div className="folder-shine" />
                  <div className="folder-count">{e.isSample ? 'SAMPLE' : `${e.photos.length} FILES`}</div>
                </div>
                <div className="folder-name">{e.name}</div>
              </button>
            ))}
          </section>
          <PageNav />
        </>
      )}

      {ev && (
        <>
          <div className="crumbs">
            <button className="cbtn ghost" onClick={() => { setOpen(null); setMsg(null) }}><span>« BACK TO FOLDERS</span></button>
            <span className="path">root/events/<b>{ev.name}_{String(open + 1).padStart(2, '0')}</b></span>
          </div>
          <Heading kicker={`FOLDER ${String(open + 1).padStart(2, '0')} / ${String(events.length).padStart(2, '0')}`}>{ev.name}</Heading>

          {canEdit && (
            <div className="admin-bar tile">
              <div className="kicker">// ADMIN TOOLS</div>
              <div className="admin-row">
                <input ref={fileRef} type="file" accept={OK_TYPES.join(',')} multiple hidden onChange={onPick} />
                <CyberButton onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'WORKING...' : '⬆ UPLOAD PHOTOS'}</CyberButton>
                <form
                  className="rename"
                  onSubmit={(e) => { e.preventDefault(); act(() => api.patch(`/events/${ev.id}`, { name: rename }), 'Event renamed.') }}
                >
                  <input value={rename} maxLength={120} onChange={(e) => setRename(e.target.value)} aria-label="Event name" />
                  <button className="cbtn ghost" type="submit" disabled={busy || !rename.trim() || rename === ev.name}><span>RENAME</span></button>
                </form>
              </div>
              <p className="hint">JPG / PNG / WEBP / GIF, up to {MAX_MB} MB each, 10 at a time.{ev.isSample && ' These are SAMPLE photos: your first upload replaces them.'}</p>
            </div>
          )}
          {msg && <div className={`notice ${msg.ok ? 'ok' : 'err'} center`} role="status">{msg.ok ? '✔' : '⚠'} {msg.t}</div>}

          <section className="photos">
            {ev.photos.map((p, j) => (
              <div className="photo-cell reveal" key={p.id ?? `s${j}`} style={{ transitionDelay: `${j * 80}ms` }}>
                <button className="photo" onClick={() => setLight(j)}>
                  <img src={p.url} alt={`${ev.name} ${j + 1}`} loading="lazy" />
                  <span className="photo-tag">{ev.coverId === p.id && photoId(p) ? '★ COVER' : `IMG_${String(j + 1).padStart(3, '0')}`}</span>
                </button>
                {canEdit && photoId(p) && (
                  <div className="photo-actions">
                    <button className="mini" disabled={busy || ev.coverId === p.id} onClick={() => act(() => api.put(`/events/${ev.id}/cover`, { image_id: p.id }), 'Cover updated.')}>★ COVER</button>
                    <button className="mini danger" disabled={busy} onClick={() => window.confirm('Delete this photo from the server?') && act(() => api.del(`/events/images/${p.id}`), 'Photo deleted.')}>🗑 DELETE</button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <div className="pagenav">
            <CyberButton variant="ghost" onClick={() => go((open - 1 + events.length) % events.length)}>« PREV EVENT</CyberButton>
            <CyberButton onClick={() => go((open + 1) % events.length)}>NEXT EVENT »</CyberButton>
          </div>
        </>
      )}

      {ev && light !== null && ev.photos[light] && (
        <div className="lightbox" onClick={() => setLight(null)}>
          <button className="lb-nav l cbtn" onClick={(e) => { e.stopPropagation(); setLight((light - 1 + ev.photos.length) % ev.photos.length) }}><span>«</span></button>
          <div className="lb-frame" onClick={(e) => e.stopPropagation()}>
            <img src={ev.photos[light].full} alt="" />
            <div className="lb-cap">{ev.name} // IMG_{String(light + 1).padStart(3, '0')} / {ev.photos.length}</div>
          </div>
          <button className="lb-nav r cbtn" onClick={(e) => { e.stopPropagation(); setLight((light + 1) % ev.photos.length) }}><span>»</span></button>
          <button className="lb-close cbtn" onClick={() => setLight(null)}><span>✕ CLOSE</span></button>
        </div>
      )}
    </div>
  )
}
