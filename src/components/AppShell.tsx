import { CalendarDays, Camera, FerrisWheel, Heart, Home, Images, LogOut, MapPinned } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../lib/utils'
import { SakuraBackground } from './SakuraBackground'

const items = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/dates', label: 'Dates', icon: CalendarDays },
  { to: '/app/places', label: 'Places', icon: MapPinned },
  { to: '/app/memories', label: 'Memories', icon: Camera },
  { to: '/app/gallery', label: 'Gallery', icon: Images },
  { to: '/app/spin', label: 'Spin', icon: FerrisWheel },
]

export function AppShell() {
  const { signOut, user } = useAuth()
  return <div className="app-shell">
    <SakuraBackground />
    <aside className="sidebar">
      <div className="logo"><span><Heart fill="currentColor" /></span><div><strong>Our Little</strong><em>World</em></div></div>
      <nav>{items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => classNames(isActive && 'active')}><Icon /> <span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-user"><div className="avatar">N</div><div><strong>Nasywa</strong><small>{user?.email}</small></div><button aria-label="Keluar" onClick={() => signOut().catch(() => toast.error('Belum berhasil keluar.'))}><LogOut /></button></div>
    </aside>
    <motion.div className="app-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Outlet /></motion.div>
    <nav className="bottom-nav">{items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => classNames(isActive && 'active')}><Icon /><span>{label}</span></NavLink>)}</nav>
  </div>
}
