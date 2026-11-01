import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

const PIC_KEY = 'ts-avatar'

// the Google sign-in token is a JWT; its payload contains the profile picture URL
function pictureFromCredential(credential) {
  try {
    const part = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(part)).picture || ''
  } catch {
    return ''
  }
}

function savePicture(email, picture) {
  try {
    if (picture) localStorage.setItem(PIC_KEY, JSON.stringify({ email, picture }))
  } catch {}
}

function withPicture(u) {
  if (!u) return u
  try {
    const saved = JSON.parse(localStorage.getItem(PIC_KEY) || 'null')
    if (saved && saved.email === u.email) return { ...u, picture: saved.picture }
  } catch {}
  return { ...u, picture: '' }
}

// Google is the ONLY way to sign in or sign up.
// The first sign-in creates the account, later sign-ins reuse it.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  // restore the session after a page refresh
  useEffect(() => {
    if (!getToken()) return
    api.get('/auth/me')
      .then((u) => setUser(withPicture(u)))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const google = useCallback(async (credential) => {
    const res = await api.post('/auth/google', { credential })
    setToken(res.access_token)
    savePicture(res.user.email, pictureFromCredential(credential))
    const u = withPicture(res.user)
    setUser(u)
    return u
  }, [])

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
    google,
    logout: () => {
      setToken(null)
      setUser(null)
      try { localStorage.removeItem(PIC_KEY) } catch {}
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}