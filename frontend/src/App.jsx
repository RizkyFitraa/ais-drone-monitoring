import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage   from './pages/LoginPage.jsx'
import Dashboard   from './pages/Dashboard.jsx'
import UserManagementPage from './pages/UserManagementPage.jsx'

const SESSION_KEY = 'ais_page'

function getInitialPage() {
  try { return sessionStorage.getItem(SESSION_KEY) || 'landing' } catch { return 'landing' }
}

function AppContent() {
  const [page, setPage] = useState(getInitialPage)
  const { user, loading, logout: authLogout } = useAuth()

  const goTo = (p) => {
    try { sessionStorage.setItem(SESSION_KEY, p) } catch {}
    setPage(p)
  }

  const handleLogout = () => {
    authLogout()
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    goTo('landing')
  }

  if (loading) return null

  return (
    <>
      {page === 'landing'   && <LandingPage onLogin={() => goTo('login')} />}
      {page === 'login'     && <LoginPage   onSuccess={() => goTo('dashboard')} onBack={() => goTo('landing')} />}
      {page === 'dashboard' && <Dashboard
        onLogout={handleLogout}
        onUsers={() => goTo('users')}
      />}
      {page === 'users'     && <UserManagementPage onBack={() => goTo('dashboard')} />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent/>
    </AuthProvider>
  )
}
