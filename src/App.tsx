import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { Loading } from './components/UI'
import { ConfigRequired } from './components/ConfigRequired'
import { AppShell } from './components/AppShell'
import { WelcomePage } from './pages/WelcomePage'
import { HomePage } from './pages/HomePage'
import { DatesPage } from './pages/DatesPage'
import { PlacesPage } from './pages/PlacesPage'
import { MemoriesPage } from './pages/MemoriesPage'
import { GalleryPage } from './pages/GalleryPage'
import { SpinPage } from './pages/SpinPage'

function Application() {
  const { user, loading } = useAuth()
  if (!isSupabaseConfigured) return <ConfigRequired />
  if (loading) return <Loading />
  return <Routes>
    <Route path="/" element={user ? <Navigate to="/app" replace /> : <WelcomePage />} />
    <Route path="/app" element={user ? <AppShell /> : <Navigate to="/" replace />}>
      <Route index element={<HomePage />} />
      <Route path="dates" element={<DatesPage />} />
      <Route path="places" element={<PlacesPage />} />
      <Route path="memories" element={<MemoriesPage />} />
      <Route path="gallery" element={<GalleryPage />} />
      <Route path="spin" element={<SpinPage />} />
    </Route>
    <Route path="*" element={<Navigate to={user ? '/app' : '/'} replace />} />
  </Routes>
}

export default function App() {
  return <AuthProvider><BrowserRouter><Application /><Toaster richColors position="top-center" /></BrowserRouter></AuthProvider>
}
