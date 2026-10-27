// =====================================================================
//  API client. The backend address comes from the VITE_API_URL
//  environment variable (see .env.example), NOT from this file.
// =====================================================================
const RAW = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')
export const API_BASE = RAW.replace(/\/$/, '')
export const API = `${API_BASE}/api`
export const API_CONFIGURED = Boolean(API_BASE)

const TOKEN_KEY = 'ts-token'
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch {}
}

// image URL for an uploaded photo
export const imgUrl = (id) => `${API}/images/${id}`
// NEW: dedicated album cover and ABOUT-page profile photo (the ?v= token changes on every upload)
export const coverUrl = (id, token) => `${API}/event-covers/${id}?v=${token}`
export const teamPhotoUrl = (id, token) => `${API}/team/photo/${id}?v=${token}`

function message(data, status) {
  const d = data && data.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d.length) {
    // FastAPI validation errors -> readable text
    return d.map((e) => `${(e.loc || []).slice(1).join('.') || 'field'}: ${e.msg}`).join(' | ')
  }
  return `Request failed (${status})`
}

async function request(path, { method = 'GET', json, form } = {}) {
  if (!API_CONFIGURED) throw new Error('Backend address is not set. Add VITE_API_URL to the frontend environment variables.')
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let body
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json) }
  if (form) body = form // browser sets the multipart boundary itself

  let res
  try {
    res = await fetch(`${API}${path}`, { method, headers, body })
  } catch {
    throw new Error('Cannot reach the server. Check your internet or try again in a minute (free servers sleep when idle).')
  }
  let data = null
  const type = res.headers.get('content-type') || ''
  if (type.includes('application/json')) { try { data = await res.json() } catch { data = null } }
  if (!res.ok) {
    const err = new Error(message(data, res.status))
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  get: (p) => request(p),
  post: (p, json) => request(p, { method: 'POST', json }),
  put: (p, json) => request(p, { method: 'PUT', json }),
  patch: (p, json) => request(p, { method: 'PATCH', json }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload: (p, files) => {
    const form = new FormData()
    ;[...files].forEach((f) => form.append('files', f))
    return request(p, { method: 'POST', form })
  },
  // NEW: send ONE file (form field "file") with PUT: album cover / team photo
  putFile: (p, file) => {
    const form = new FormData()
    form.append('file', file)
    return request(p, { method: 'PUT', form })
  },
  // download a protected file (CSV) with the login token
  download: async (path, filename) => {
    const token = getToken()
    const res = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) throw new Error('Download failed.')
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}