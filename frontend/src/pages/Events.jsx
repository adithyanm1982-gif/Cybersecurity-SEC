import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heading, PageNav, CyberButton } from '../components/Shared.jsx'
import { useAuth } from '../auth.jsx'
import { api, imgUrl, coverUrl } from '../api.js'

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
// cover priority: uploaded cover  >  photo chosen as cover  >  first photo  >  sample
function normalize(list) {
  return list.map((e, i) => {
    const real = e.images.map((im) => ({ id: im.id, url: imgUrl(im.id), full: imgUrl(im.id) }))
    const custom = e.custom_cover ? coverUrl(e.custom_cover.id, e.custom_cover.token) : null
    return {
      id: e.id,
      name: e.name,
      coverId: e.cover_image_id,
      coverChosen: Boolean(e.cover_chosen),
      hasCustomCover: Boolean(custom),
      cover: custom || (e.cover_image_id ? imgUrl(e.cover_image_id) : real[0]?.url) || sample(`cyber-cover-${i + 1}`, 600),
      photos: real.length ? real : samplePhotos(i),
      isSample: real.length === 0,
    }
  })
}

// shown when the server cannot be reached
const OFFLINE = Array.from({ length: 9 }, (_, i) => ({
  id: null, name: 'EEE', coverId: null, coverChosen: false, hasCustomCover: false, cover: sample(`cyber-cover-${i + 1}`, 600), photos: samplePhotos(i), isSample: true,
}))

// returns an error text, or null when the file is fine
const checkFile = (f) =>
  !OK_TYPES.includes(f.type) || f.size > MAX_MB * 1024 * 1024
    ? `"${f.name}": only JPG, PNG, WEBP or GIF up to ${MAX_MB} MB.`
    : null

export default function Events() {
  const { isAdmin, user } = useAuth()
  const [events, setEvents] = useState(null)
  const [offline, setOffline] = useState(false)
  const [open, setOpen] = useState(null)
  const [light, setLight] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // {ok, t}
  const [rename, setRename] = useState('')
  const fileRef = useRef(null) // photos inside an album
  const coverRef = useRef(null) // album cover picture
  const coverFor = useRef(null) // id of the album whose cover is being changed

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
  const adminOn = isAdmin && !offline // admin tools only when logged in as admin AND the server answered
  const canEdit = adminOn && ev && ev.id !== null

  // run an admin action, then reload from the server
  const act = async (fn, okText) => {
    setBusy(true); setMsg(null)
    try { await fn(); await refresh(); setMsg({ ok: true, t: okText }) }
    catch (e) { setMsg({ ok: false, t: e.message }) }
    finally { setBusy(false) }
  }

  // ----- photos inside an album -----
  const onPick = (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    const bad = files.map(checkFile).find(Boolean)
    if (bad) return setMsg({ ok: false, t: bad })
    act(() => api.upload(`/events/${ev.id}/images`, files), `${files.length} photo(s) uploaded to the server.`)
  }

  // ----- album cover picture (works from the folder grid AND from inside the album) -----
  const pickCover = (eventId) => { coverFor.current = eventId; coverRef.current?.click() }
  const onPickCover = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    const id = coverFor.current
    if (!file || id == null) return
    const bad = checkFile(file)
    if (bad) return setMsg({ ok: false, t: bad })
    act(() => api.putFile(`/events/${id}/cover-image`, file), 'Album cover uploaded.')
  }
  const removeCover = (e) => {
    if (!window.confirm('Remove the cover picture of this album?')) return
    act(async () => {
      if (e.hasCustomCover) await api.del(`/events/${e.id}/cover-image`)
      if (e.coverChosen) await api.put(`/events/${e.id}/cover`, { image_id: null }) // also forget a photo chosen as cover
    }, 'Album cover removed.')
  }
  const hasCover = (e) => e.hasCustomCover || e.coverChosen

  const photoId = (p) => p.id !== null

  const msgBox = msg ? <div className={`notice ${msg.ok ? 'ok' : 'err'} center`} role="status">{msg.ok ? '✔' : '⚠'} {msg.t}</div> : null

  return (
    <div className="container">
      {/* hidden pickers shared by every button on this page */}
      <input ref={fileRef} type="file" accept={OK_TYPES.join(',')} multiple hidden onChange={onPick} />
      <input ref={coverRef} type="file" accept={OK_TYPES.join(',')} hidden onChange={onPickCover} />

      {!events && <p className="lead center">LOADING ARCHIVE...</p>}

      {events && !ev && (
        <>
          <Heading kicker="MEMORY ARCHIVE">Events Gallery</Heading>
          <p className="lead center reveal">Open a folder to browse the photos of past Cybersecurity domain events.</p>
          {offline && <div className="notice warn center">Server not reachable: showing sample data. (Free servers need ~1 minute to wake up: refresh the page.)</div>}
          {adminOn && <div className="notice ok center">ADMIN MODE: use the buttons under each album to change its cover, or open a folder to manage its photos.</div>}
          {!user && <p className="hint center">Admin? Open <b>⚙ Settings</b> or <Link to="/login">log in</Link> to manage photos.</p>}
          {msgBox}
          <section className="folders">
            {events.map((e, i) => (
              <div className="folder-card reveal" key={e.id ?? i} style={{ transitionDelay: `${i * 50}ms` }}>
                <button className="folder" onClick={() => go(i)}>
                  <div className="folder-tab"><span>DIR_{String(i + 1).padStart(2, '0')}</span></div>
                  <div className="folder-body">
                    <img src={e.cover} alt={`${e.name} cover`} loading="lazy" />
                    <div className="folder-shine" />
                    <div className="folder-count">{e.isSample ? 'SAMPLE' : `${e.photos.length} FILES`}</div>
                  </div>
                  <div className="folder-name">{e.name}</div>
                </button>
                {adminOn && e.id !== null && (
                  <div className="folder-tools">
                    <button className="mini" disabled={busy} onClick={() => pickCover(e.id)}>⬆ {hasCover(e) ? 'CHANGE COVER' : 'UPLOAD COVER'}</button>
                    {hasCover(e) && <button className="mini danger" disabled={busy} onClick={() => removeCover(e)} aria-label="Remove cover">🗑 COVER</button>}
                  </div>
                )}
              </div>
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

              <div className="admin-group">
                <div className="admin-label">ALBUM COVER</div>
                <div className="admin-row">
                  <img className="cover-thumb" src={ev.cover} alt="Current album cover" />
                  <CyberButton onClick={() => pickCover(ev.id)} disabled={busy}>{busy ? 'WORKING...' : `⬆ ${hasCover(ev) ? 'CHANGE' : 'UPLOAD'} COVER`}</CyberButton>
                  {hasCover(ev) && <CyberButton variant="alt" onClick={() => removeCover(ev)} disabled={busy}>🗑 REMOVE COVER</CyberButton>}
                </div>
              </div>

              <div className="admin-group">
                <div className="admin-label">PHOTOS INSIDE THIS ALBUM</div>
                <div className="admin-row">
                  <CyberButton onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'WORKING...' : '⬆ UPLOAD PHOTOS'}</CyberButton>
                  <form
                    className="rename"
                    onSubmit={(e) => { e.preventDefault(); act(() => api.patch(`/events/${ev.id}`, { name: rename }), 'Event renamed.') }}
                  >
                    <input value={rename} maxLength={120} onChange={(e) => setRename(e.target.value)} aria-label="Event name" />
                    <button className="cbtn ghost" type="submit" disabled={busy || !rename.trim() || rename === ev.name}><span>RENAME</span></button>
                  </form>
                </div>
              </div>
              <p className="hint">JPG / PNG / WEBP / GIF, up to {MAX_MB} MB each, 10 at a time. Hover a photo to set it as cover or delete it.{ev.isSample && ' These are SAMPLE photos: your first upload replaces them.'}</p>
            </div>
          )}
          {msgBox}

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