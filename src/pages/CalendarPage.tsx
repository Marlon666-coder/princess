import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRecords } from '../hooks/useRecords'
import { EmptyState, Modal } from '../components/UI'
import { formatDate } from '../lib/utils'
import type { CoupleDate } from '../types'

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function CalendarPage() {
  const { records: dates, loading } = useRecords<CoupleDate>('dates', 'date', true)
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const byDay = useMemo(() => dates.reduce<Record<string, CoupleDate[]>>((all, date) => {
    (all[date.date] ??= []).push(date); return all
  }, {}), [dates])

  const year = cursor.getFullYear(), month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = localKey(new Date())
  const move = (offset: number) => { setCursor(new Date(year, month + offset, 1)); setSelectedDay(null) }
  const dayDates = selectedDay ? (byDay[selectedDay] ?? []) : []

  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Our shared timeline</p><h1>Kalender Kita 📅</h1><p>Semua rencana date kita dalam satu tempat.</p></div></header>

    {loading ? <div className="skeleton-list" /> : <section className="card calendar">
      <div className="calendar-heading">
        <button onClick={() => move(-1)} aria-label="Bulan sebelumnya"><ChevronLeft /></button>
        <h2>{cursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => move(1)} aria-label="Bulan berikutnya"><ChevronRight /></button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((day) => <b key={day}>{day}</b>)}
        {Array.from({ length: firstWeekday }).map((_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const items = byDay[key] ?? []
          return <button key={day} className={`${items.length ? 'has-date' : ''} ${key === todayKey ? 'is-today' : ''}`} onClick={() => items.length && setSelectedDay(key)} disabled={!items.length}>
            <strong>{day}</strong>
            {items.slice(0, 2).map((date) => <span key={date.id} className={`cal-chip status-${date.status}`}>❤️ {date.title}<small>⏰ {date.planned_start_time.slice(0, 5)}</small></span>)}
            {items.length > 2 && <em className="cal-more">+{items.length - 2} lagi</em>}
          </button>
        })}
      </div>
    </section>}

    {!loading && !dates.length && <EmptyState icon="📅" title="Belum ada date di kalender." text="Buat rencana date dulu, nanti otomatis muncul di sini." />}

    <Modal open={Boolean(selectedDay)} title={selectedDay ? formatDate(selectedDay) : ''} onClose={() => setSelectedDay(null)}>
      <div className="cal-day-list">{dayDates.map((date) => <button key={date.id} className="cal-day-item" onClick={() => navigate('/app/dates')}>
        <span className={`status status-${date.status}`}>{date.status}</span>
        <h3>{date.title}</h3>
        <p><Clock3 /> {date.planned_start_time.slice(0, 5)} — {date.planned_finish_time.slice(0, 5)}</p>
        <p><MapPin /> {date.location_name || 'Lokasi menyusul'}</p>
        <small><CalendarDays /> Lihat di halaman Dates →</small>
      </button>)}</div>
    </Modal>
  </main>
}
