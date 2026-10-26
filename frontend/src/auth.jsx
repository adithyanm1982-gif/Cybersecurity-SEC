import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

// Google is the ONLY way to sign in or sign up.
// The first sign-in creates the account, later sign-ins reuse it.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  // restore the session after a page refresh
  useEffect(() => {
    if (!getToken()) return
    api.get('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const google = useCallback(async (credential) => {
    const res = await api.post('/auth/google', { credential })
    setToken(res.access_token)
    setUser(res.user)
    return res.user
  }, [])

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
    google,
    logout: () => { setToken(null); setUser(null) },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
