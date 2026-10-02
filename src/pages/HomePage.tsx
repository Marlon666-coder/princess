import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Camera, Clock3, FerrisWheel, Heart, MapPin, MapPinned, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRecords } from '../hooks/useRecords'
import type { CoupleDate, Photo, Place, SpinHistory } from '../types'
import { countdown, formatDate } from '../lib/utils'

export function HomePage() {
  const { records: dates } = useRecords<CoupleDate>('dates', 'date', true)
  const { records: places } = useRecords<Place>('places')
  const { records: photos } = useRecords<Photo>('photos')
  const { records: spins } = useRecords<SpinHistory>('spin_history')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  const next = useMemo(() => dates.find((date) => date.status === 'planned' && new Date(`${date.date}T${date.planned_start_time}`).getTime() > now), [dates, now])
  const completed = dates.filter((date) => date.status === 'completed')
  const totalMs = completed.reduce((sum, date) => sum + (date.actual_finish_at && date.actual_start_at ? new Date(date.actual_finish_at).getTime() - new Date(date.actual_start_at).getTime() : 0), 0)
  const actions = [
    { to: '/app/dates?new=1', icon: CalendarPlus, title: 'Plan a Date', text: 'Rencanakan hari istimewa' },
    { to: '/app/memories?new=1', icon: Camera, title: 'Add Memory', text: 'Simpan momen manis' },
    { to: '/app/places', icon: MapPinned, title: 'Explore Places', text: 'Temukan tempat baru' },
    { to: '/app/spin', icon: FerrisWheel, title: 'Spin The Wheel', text: 'Biarkan semesta memilih' },
  ]
  return <main className="page">
    <header className="page-header hero-header"><div><p className="eyebrow">{new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date())}, our favorite kind of day</p><h1>Hi, Nasywa <span>❤️</span></h1><p>Sudah siap membuat kenangan baru?</p></div><div className="header-hearts">♡ <span>♥</span> ♡</div></header>
    <section className="quick-grid">{actions.map(({ to, icon: Icon, title, text }, index) => <Link to={to} className={`quick-card tone-${index}`} key={to}><Icon /><div><h3>{title}</h3><p>{text}</p></div><span>→</span></Link>)}</section>
    <div className="dashboard-grid">
      <section className="card next-date"><div className="section-title"><div><p className="eyebrow">Up next</p><h2>Next Date ❤️</h2></div><Link to="/app/dates">Lihat semua</Link></div>
        {next ? <><div className="date-ticket"><div className="date-number"><strong>{new Date(`${next.date}T00:00:00`).getDate()}</strong><span>{new Date(`${next.date}T00:00:00`).toLocaleDateString('id-ID', { month: 'short' })}</span></div><div><h3>{next.title}</h3><p><Clock3 /> {next.planned_start_time.slice(0,5)} — {next.planned_finish_time.slice(0,5)}</p><p><MapPin /> {next.location_name || 'Lokasi menyusul'}</p><small>{formatDate(next.date)}</small></div></div><div className="countdown"><small>Counting down to us</small><strong>{countdown(`${next.date}T${next.planned_start_time}`)}</strong></div></> : <div className="mini-empty"><Heart /><p>Belum ada rencana date.</p><Link to="/app/dates?new=1">Buat rencana pertama</Link></div>}
      </section>
      <section className="card"><div className="section-title"><div><p className="eyebrow">Our journey</p><h2>Little Statistics</h2></div></div><div className="stats-grid">
        <div><Heart /><strong>{completed.length}</strong><span>Dates Together</span></div><div><MapPin /><strong>{places.length}</strong><span>Places Visited</span></div><div><Camera /><strong>{photos.length}</strong><span>Photos</span></div><div><Star /><strong>{places.filter((p) => p.is_favorite).length}</strong><span>Favorite Places</span></div><div><Clock3 /><strong>{Math.round(totalMs / 3600000)}</strong><span>Hours Together</span></div><div><FerrisWheel /><strong>{spins.length}</strong><span>Wheel Spins</span></div>
      </div></section>
    </div>
  </main>
}
