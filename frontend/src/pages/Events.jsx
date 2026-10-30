import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heading, PageNav, CyberButton } from '../components/Shared.jsx'
import Icon from '../components/Icons.jsx'
import { useAuth } from '../auth.jsx'
import { api, imgUrl, coverUrl } from '../api.js'
import { sfx } from '../fx.js'

const MAX_MB = 5
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// turn the API answer into what the page needs
// cover priority: uploaded cover  >  photo chosen as cover  >  first photo  >  none
function normalize(list) {
  return list.map((e) => {
    const photos = e.images.map((im) => ({ id: im.id, url: imgUrl(im.id) }))
    const custom = e.custom_cover ? coverUrl(e.custom_cover.id, e.custom_cover.token) : null
    return {
      id: e.id,
      name: e.name,
      coverId: e.cover_image_id,
      coverChosen: Boolean(e.cover_chosen),
      hasCustomCover: Boolean(custom),
      cover: custom || (e.cover_image_id ? imgUrl(e.cover_image_id) : null),
      photos,
    }
  })
}

// returns an error text, or null when the file is fine
const checkFile = (f) =>
  !OK_TYPES.includes(f.type) || f.size > MAX_MB * 1024 * 1024
    ? `"${f.name}": only JPG, PNG, WEBP or GIF up to ${MAX_MB} MB.`
    : null

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`

export default function Events() {
  const { isAdmin, user } = useAuth()
  const [events, setEvents] = useState(null)
  const [offline, setOffline] = useState(false)
  const [openId, setOpenId] = useState(null) // id of the album being viewed
  const [light, setLight] = useState(null) // photo shown in the lightbox
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // {ok, t}
  const [rename, setRename] = useState('')
  const [newName, setNewName] = useState('')
  const fileRef = useRef(null) // photos inside an album
  const coverRef = useRef(null) // album cover picture
  const coverFor = useRef(null) // id of the album whose cover is being changed

  const refresh = useCallback(async () => {
    try {
      setEvents(normalize(await api.get('/events')))
      setOffline(false)
    } catch {
      setEvents((e) => e || [])
      setOffline(true)
    }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const idx = events && openId !== null ? events.findIndex((e) => e.id === openId) : -1
  const ev = idx >= 0 ? events[idx] : null
  useEffect(() => { if (ev) setRename(ev.name) }, [ev?.id, ev?.name]) // eslint-disable-line

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') light !== null ? setLight(null) : setOpenId(null)
      if (light !== null && ev) {
        if (e.key === 'ArrowRight') setLight((l) => (l + 1) % ev.photos.length)
        if (e.key === 'ArrowLeft') setLight((l) => (l - 1 + ev.photos.length) % ev.photos.length)
      }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [light, ev])

  const openAlbum = (id) => { setLight(null); setMsg(null); setOpenId(id); window.scrollTo({ top: 0 }) }
  const adminOn = isAdmin && !offline // admin tools only when logged in as admin AND the server answered

  // run an admin action, then reload from the server
  const act = async (fn, okText) => {
    setBusy(true); setMsg(null)
    try { await fn(); await refresh(); setMsg({ ok: true, t: okText }); sfx.play('success'); return true }
    catch (e) { setMsg({ ok: false, t: e.message }); sfx.play('error'); return false }
    finally { setBusy(false) }
  }
  const fail = (t) => { setMsg({ ok: false, t }); sfx.play('error') }

  // ----- folders: add / delete -----
  const addFolder = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (await act(() => api.post('/events', { name }), `Folder "${name}" created.`)) setNewName('')
  }
  const deleteFolder = async (e) => {
    const ok = window.confirm(`Delete the folder "${e.name}" and all ${plural(e.photos.length, 'photo')} inside it? This cannot be undone.`)
    if (!ok) return
    if (await act(() => api.del(`/events/${e.id}`), `Folder "${e.name}" deleted.`)) setOpenId(null)
  }

  // ----- photos inside an album: add / delete -----
  const onPick = (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    const bad = files.map(checkFile).find(Boolean)
    if (bad) return fail(bad)
    act(() => api.upload(`/events/${ev.id}/images`, files), `${plural(files.length, 'photo')} uploaded.`)
  }

  // ----- album cover picture (works from the folder grid AND from inside the album) -----
  const pickCover = (eventId) => { coverFor.current = eventId; coverRef.current?.click() }
  const onPickCover = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    const id = coverFor.current
    if (!file || id == null) return
    const bad = checkFile(file)
    if (bad) return fail(bad)
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
  const coverOf = (e) => e.cover || e.photos[0]?.url || null

  const msgBox = msg ? <div className={`notice ${msg.ok ? 'ok' : 'err'} center`} role="status">{msg.t}</div> : null

  return (
    <div className="container">
      {/* hidden pickers shared by every button on this page */}
      <input ref={fileRef} type="file" accept={OK_TYPES.join(',')} multiple hidden onChange={onPick} />
      <input ref={coverRef} type="file" accept={OK_TYPES.join(',')} hidden onChange={onPickCover} />

      {!events && <p className="lead center">Loading gallery...</p>}

      {events && !ev && (
        <>
          <Heading kicker="Memory archive">Events Gallery</Heading>
          <p className="lead center reveal">Open a folder to browse the photos of past Cybersecurity domain events.</p>
          {offline && <div className="notice warn center">The gallery is temporarily unavailable. (Free servers need about a minute to wake up: refresh the page.)</div>}
          {adminOn && <div className="notice ok center">Admin mode: add or delete folders, change a folder’s cover, or open a folder to manage its photos.</div>}
          {!user && <p className="hint center">Admin? Open Settings or <Link to="/login">log in</Link> to manage the gallery.</p>}
          {msgBox}

          {adminOn && (
            <form className="add-folder tile" onSubmit={addFolder}>
              <label htmlFor="new-folder">New folder</label>
              <input id="new-folder" value={newName} maxLength={120} placeholder="Folder name, e.g. Hackathon 2026" onChange={(e) => setNewName(e.target.value)} />
              <button className="cbtn" type="submit" disabled={busy || !newName.trim()}><span><Icon name="plus" size={16} />Add folder</span></button>
            </form>
          )}

          {events.length === 0 && !offline && <p className="lead center">No folders yet.{adminOn ? ' Create the first one above.' : ''}</p>}

          <section className="folders">
            {events.map((e, i) => (
              <div className="folder-card reveal" key={e.id} style={{ transitionDelay: `${Math.min(i, 8) * 40}ms` }}>
                <button className="folder" onClick={() => openAlbum(e.id)}>
                  <div className="folder-body">
                    {coverOf(e)
                      ? <img src={coverOf(e)} alt={`${e.name} cover`} loading="lazy" />
                      : <div className="cover-empty"><Icon name="image" size={30} /><span>No cover yet</span></div>}
                  </div>
                  <div className="folder-info">
                    <span className="folder-name">{e.name}</span>
                    <span className="folder-count">{plural(e.photos.length, 'photo')}</span>
                  </div>
                </button>
                {adminOn && (
                  <div className="folder-tools">
                    <button className="mini" disabled={busy} onClick={() => pickCover(e.id)}><Icon name="upload" size={13} /> {hasCover(e) ? 'Change cover' : 'Upload cover'}</button>
                    {hasCover(e) && <button className="mini danger" disabled={busy} onClick={() => removeCover(e)}><Icon name="trash" size={13} /> Cover</button>}
                    <button className="mini danger" disabled={busy} onClick={() => deleteFolder(e)}><Icon name="trash" size={13} /> Delete folder</button>
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
            <button className="cbtn ghost" onClick={() => { setOpenId(null); setMsg(null) }}><span><Icon name="arrow-left" size={16} />All folders</span></button>
            <span className="crumb-path">Events / <b>{ev.name}</b></span>
          </div>
          <Heading kicker={`Folder ${idx + 1} of ${events.length}`}>{ev.name}</Heading>

          {adminOn && (
            <div className="admin-bar tile">
              <div className="kicker">Admin tools</div>

              <div className="admin-group">
                <div className="admin-label">Folder cover</div>
                <div className="admin-row">
                  {coverOf(ev) ? <img className="cover-thumb" src={coverOf(ev)} alt="Current folder cover" /> : <div className="cover-thumb empty"><Icon name="image" size={20} /></div>}
                  <CyberButton onClick={() => pickCover(ev.id)} disabled={busy}><Icon name="upload" size={16} />{hasCover(ev) ? 'Change cover' : 'Upload cover'}</CyberButton>
                  {hasCover(ev) && <CyberButton variant="danger" onClick={() => removeCover(ev)} disabled={busy}><Icon name="trash" size={16} />Remove cover</CyberButton>}
                </div>
              </div>

              <div className="admin-group">
                <div className="admin-label">Photos in this folder</div>
                <div className="admin-row">
                  <CyberButton onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="plus" size={16} />{busy ? 'Working...' : 'Add photos'}</CyberButton>
                </div>
              </div>

              <div className="admin-group">
                <div className="admin-label">Folder</div>
                <div className="admin-row">
                  <form className="rename" onSubmit={(e) => { e.preventDefault(); act(() => api.patch(`/events/${ev.id}`, { name: rename }), 'Folder renamed.') }}>
                    <input value={rename} maxLength={120} onChange={(e) => setRename(e.target.value)} aria-label="Folder name" />
                    <button className="cbtn ghost" type="submit" disabled={busy || !rename.trim() || rename === ev.name}><span>Rename</span></button>
                  </form>
                  <CyberButton variant="danger" onClick={() => deleteFolder(ev)} disabled={busy}><Icon name="trash" size={16} />Delete folder</CyberButton>
                </div>
              </div>
              <p className="hint">JPG, PNG, WEBP or GIF, up to {MAX_MB} MB each, 10 at a time. Hover a photo to set it as the cover or delete it.</p>
            </div>
          )}
          {msgBox}

          {ev.photos.length === 0 && <div className="empty-state tile"><Icon name="image" size={30} /><p>No photos have been added to this folder yet.</p></div>}

          <section className="photos">
            {ev.photos.map((p, j) => (
              <div className="photo-cell reveal" key={p.id} style={{ transitionDelay: `${Math.min(j, 8) * 50}ms` }}>
                <button className="photo" onClick={() => setLight(j)}>
                  <img src={p.url} alt={`${ev.name} photo ${j + 1}`} loading="lazy" />
                  {ev.coverId === p.id && ev.coverChosen && <span className="photo-tag">Cover</span>}
                </button>
                {adminOn && (
                  <div className="photo-actions">
                    <button className="mini" disabled={busy || (ev.coverId === p.id && ev.coverChosen)} onClick={() => act(() => api.put(`/events/${ev.id}/cover`, { image_id: p.id }), 'Cover updated.')}><Icon name="star" size={13} /> Set cover</button>
                    <button className="mini danger" disabled={busy} onClick={() => window.confirm('Delete this photo permanently?') && act(() => api.del(`/events/images/${p.id}`), 'Photo deleted.')}><Icon name="trash" size={13} /> Delete</button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <div className="pagenav">
            <CyberButton variant="ghost" disabled={events.length < 2} onClick={() => openAlbum(events[(idx - 1 + events.length) % events.length].id)}><Icon name="arrow-left" size={16} />Previous folder</CyberButton>
            <CyberButton disabled={events.length < 2} onClick={() => openAlbum(events[(idx + 1) % events.length].id)}>Next folder<Icon name="arrow-right" size={16} /></CyberButton>
          </div>
        </>
      )}

      {ev && light !== null && ev.photos[light] && (
        <div className="lightbox" onClick={() => setLight(null)}>
          <button className="lb-nav l cbtn ghost" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setLight((light - 1 + ev.photos.length) % ev.photos.length) }}><span><Icon name="chevron-left" size={20} /></span></button>
          <div className="lb-frame" onClick={(e) => e.stopPropagation()}>
            <img src={ev.photos[light].url} alt="" />
            <div className="lb-cap">{ev.name} · {light + 1} / {ev.photos.length}</div>
          </div>
          <button className="lb-nav r cbtn ghost" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setLight((light + 1) % ev.photos.length) }}><span><Icon name="chevron-right" size={20} /></span></button>
          <button className="lb-close cbtn ghost" onClick={() => setLight(null)}><span><Icon name="close" size={16} />Close</span></button>
        </div>
      )}
    </div>
  )
}