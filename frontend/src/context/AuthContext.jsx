import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const SESSION_KEY = 'ais_auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.token && data.user) {
          setToken(data.token)
          setUser(data.user)
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login gagal')
    setToken(data.token)
    setUser(data.user)
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, user: data.user })) } catch {}
    return data.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
