import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Edit3, Heart, MapPin, Play, Plus, Square, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EmptyState, Input, Modal, Select, Textarea } from '../components/UI'
import { useRecords } from '../hooks/useRecords'
import { friendlyError, supabase } from '../lib/supabase'
import { formatDate, formatDateTime, formatDuration } from '../lib/utils'
import type { CoupleDate, DateActivity, DateStatus } from '../types'

const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const blankDate = { title: '', description: '', date: today, planned_start_time: '18:00', planned_finish_time: '21:00', status: 'planned' as DateStatus, location_name: '', address: '', budget: '', cover_image_url: '' }

export function DatesPage() {
  const { records: dates, loading, refresh } = useRecords<CoupleDate>('dates', 'date', false)
  const [params, setParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(params.get('new') === '1')
  const [editing, setEditing] = useState<CoupleDate | null>(null)
  const [selected, setSelected] = useState<CoupleDate | null>(null)
  const [activities, setActivities] = useState<DateActivity[]>([])
  const [activityOpen, setActivityOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<DateActivity | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    if (!selected) { setActivities([]); return () => { active = false } }
    supabase.from('date_activities').select('*').eq('date_id', selected.id).order('order_index').then(({ data, error }) => {
      if (!active) return
      if (error) toast.error(friendlyError(error)); else setActivities((data ?? []) as DateActivity[])
    })
    return () => { active = false }
  }, [selected])

  const grouped = useMemo(() => dates.reduce<Record<string, CoupleDate[]>>((all, date) => ({ ...all, [date.date]: [...(all[date.date] ?? []), date] }), {}), [dates])

  function closeForm() { setFormOpen(false); setEditing(null); setParams({}) }
  async function saveDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = new FormData(event.currentTarget)
    const status = String(form.get('status')) as DateStatus
    const values = {
      title: String(form.get('title')), description: String(form.get('description')) || null,
      date: String(form.get('date')), planned_start_time: String(form.get('planned_start_time')),
      planned_finish_time: String(form.get('planned_finish_time')), status,
      location_name: String(form.get('location_name')) || null, address: String(form.get('address')) || null,
      budget: form.get('budget') ? Number(form.get('budget')) : null,
      cover_image_url: String(form.get('cover_image_url')) || null,
      ...((status === 'planned' || status === 'cancelled') ? { actual_start_at: null, actual_finish_at: null } : {}),
    }
    const { error } = editing ? await supabase.from('dates').update(values).eq('id', editing.id) : await supabase.from('dates').insert(values)
    setBusy(false)
    if (error) return toast.error(friendlyError(error))
    toast.success('Saved to our little world ❤️'); closeForm(); await refresh()
  }
  async function deleteDate(date: CoupleDate) {
    if (!confirm(`Hapus rencana “${date.title}” beserta aktivitasnya?`)) return
    const { error } = await supabase.from('dates').delete().eq('id', date.id)
    if (error) toast.error(friendlyError(error)); else { toast.success('Rencana dihapus'); setSelected(null); await refresh() }
  }
  async function track(date: CoupleDate, finish = false) {
    const { error: trackingError } = await supabase.rpc(finish ? 'finish_couple_date' : 'start_couple_date', { p_date_id: date.id })
    if (trackingError) return toast.error(friendlyError(trackingError))
    const { data, error } = await supabase.from('dates').select('*').eq('id', date.id).single()
    if (error) return toast.error(friendlyError(error))
    const updated = data as CoupleDate; setSelected(updated); await refresh()
    toast.success(finish ? 'Another beautiful memory completed ❤️' : 'Date kita dimulai ❤️')
  }
  async function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return
    const form = new FormData(event.currentTarget)
    const values = { date_id: selected.id, title: String(form.get('title')), description: String(form.get('description')) || null, start_time: String(form.get('start_time')), finish_time: String(form.get('finish_time')) || null, location_name: String(form.get('location_name')) || null, order_index: editingActivity?.order_index ?? (Math.max(-1, ...activities.map(({ order_index }) => order_index)) + 1) }
    const query = editingActivity ? supabase.from('date_activities').update(values).eq('id', editingActivity.id) : supabase.from('date_activities').insert(values)
    const { data, error } = await query.select().single()
    if (error) return toast.error(friendlyError(error))
    const saved = data as DateActivity
    setActivities(editingActivity ? activities.map((activity) => activity.id === saved.id ? saved : activity) : [...activities, saved])
    setActivityOpen(false); setEditingActivity(null); toast.success(editingActivity ? 'Kegiatan diperbarui ❤️' : 'Kegiatan ditambahkan ❤️')
  }
  async function removeActivity(activity: DateActivity) {
    const { error } = await supabase.from('date_activities').delete().eq('id', activity.id)
    if (error) toast.error(friendlyError(error)); else setActivities(activities.filter(({ id }) => id !== activity.id))
  }
  async function moveActivity(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= activities.length) return
    const reordered = [...activities]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setActivities(reordered)
    const { error } = await supabase.rpc('reorder_date_activities', { p_date_id: selected?.id, p_activity_ids: reordered.map(({ id }) => id) })
    if (error) { toast.error(friendlyError(error)); setActivities(activities) }
  }

  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Our plans</p><h1>Dates Together ❤️</h1><p>Setiap rencana kecil bisa menjadi kenangan besar.</p></div><Button onClick={() => setFormOpen(true)}><Plus /> Plan a Date</Button></header>
    <div className="segmented"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Daftar</button><button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Kalender</button></div>
    {loading ? <div className="skeleton-list" /> : !dates.length ? <EmptyState icon="💌" title="Belum ada rencana date." text="Mau pergi ke mana bersama Nasywa?" /> : view === 'list' ? <section className="date-list">{dates.map((date) => <article className="date-card" key={date.id} onClick={() => setSelected(date)}><div className="date-number"><strong>{new Date(`${date.date}T00:00:00`).getDate()}</strong><span>{new Date(`${date.date}T00:00:00`).toLocaleDateString('id-ID', { month: 'short' })}</span></div><div className="date-main"><span className={`status status-${date.status}`}>{date.status}</span><h2>{date.title}</h2><p><Clock3 /> {date.planned_start_time.slice(0,5)} — {date.planned_finish_time.slice(0,5)}</p><p><MapPin /> {date.location_name || 'Lokasi menyusul'}</p></div><span className="open-arrow">→</span></article>)}</section> : <CalendarView grouped={grouped} onSelect={setSelected} />}

    <Modal open={formOpen} title={editing ? 'Edit Date ❤️' : 'Plan a Date ❤️'} onClose={closeForm} wide><form className="form-grid" onSubmit={saveDate}>
      <Input label="Judul" name="title" defaultValue={editing?.title ?? blankDate.title} placeholder="Dinner Date ❤️" required />
      <Select label="Status" name="status" defaultValue={editing?.status ?? blankDate.status}><option value="planned">Planned</option>{editing?.status === 'ongoing' && <option value="ongoing">Ongoing (tracking)</option>}{editing?.status === 'completed' && <option value="completed">Completed (tracking)</option>}<option value="cancelled">Cancelled</option></Select>
      <Textarea label="Deskripsi" name="description" defaultValue={editing?.description ?? blankDate.description} className="span-2" />
      <Input label="Tanggal" name="date" type="date" defaultValue={editing?.date ?? blankDate.date} required />
      <Input label="Budget (Rp)" name="budget" type="number" min="0" defaultValue={editing?.budget ?? blankDate.budget} />
      <Input label="Mulai" name="planned_start_time" type="time" defaultValue={editing?.planned_start_time?.slice(0,5) ?? blankDate.planned_start_time} required />
      <Input label="Selesai" name="planned_finish_time" type="time" defaultValue={editing?.planned_finish_time?.slice(0,5) ?? blankDate.planned_finish_time} required />
      <Input label="Nama lokasi" name="location_name" defaultValue={editing?.location_name ?? blankDate.location_name} placeholder="Jakarta" />
      <Input label="Alamat" name="address" defaultValue={editing?.address ?? blankDate.address} />
      <Input label="Cover image URL" name="cover_image_url" type="url" defaultValue={editing?.cover_image_url ?? blankDate.cover_image_url} placeholder="https://…" />
      <div className="form-actions span-2"><Button type="button" variant="secondary" onClick={closeForm}>Batal</Button><Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Date ❤️'}</Button></div>
    </form></Modal>

    <Modal open={Boolean(selected)} title={selected?.title ?? 'Date detail'} onClose={() => setSelected(null)} wide>{selected && <div className="date-detail">
      <div className="detail-meta"><span className={`status status-${selected.status}`}>{selected.status}</span><p><CalendarDays /> {formatDate(selected.date)}</p><p><Clock3 /> {selected.planned_start_time.slice(0,5)} — {selected.planned_finish_time.slice(0,5)}</p><p><MapPin /> {selected.location_name || 'Lokasi menyusul'}</p>{selected.description && <p>{selected.description}</p>}</div>
      <div className="tracking-card"><Heart fill="currentColor" /><div><small>Actual date tracking</small><p>Mulai: {formatDateTime(selected.actual_start_at)}</p><p>Selesai: {formatDateTime(selected.actual_finish_at)}</p>{selected.actual_start_at && selected.actual_finish_at && <strong>Duration: {formatDuration(selected.actual_start_at, selected.actual_finish_at)}</strong>}</div>{selected.status === 'planned' ? <Button onClick={() => track(selected)}><Play /> Start Date ❤️</Button> : selected.status === 'ongoing' ? <Button onClick={() => track(selected, true)}><Square /> Finish Date ❤️</Button> : null}</div>
      <div className="section-title"><h3>Our Timeline</h3><Button variant="secondary" onClick={() => { setEditingActivity(null); setActivityOpen(true) }}><Plus /> Activity</Button></div>
      {!activities.length ? <p className="muted">Belum ada kegiatan dalam date ini.</p> : <div className="timeline">{activities.map((activity, index) => <div className="timeline-item" key={activity.id}><time>{activity.start_time.slice(0,5)}</time><span className="timeline-dot" /><div onClick={() => { setEditingActivity(activity); setActivityOpen(true) }} role="button" tabIndex={0}><strong>{activity.title}</strong><p>{activity.description}</p><small>{activity.location_name}</small></div><div className="reorder"><button onClick={() => moveActivity(index, -1)}><ChevronUp /></button><button onClick={() => moveActivity(index, 1)}><ChevronDown /></button><button onClick={() => removeActivity(activity)}><Trash2 /></button></div></div>)}</div>}
      <div className="form-actions"><Button variant="danger" onClick={() => deleteDate(selected)}><Trash2 /> Hapus</Button><Button variant="secondary" onClick={() => { setEditing(selected); setSelected(null); setFormOpen(true) }}><Edit3 /> Edit</Button></div>
    </div>}</Modal>
    <Modal open={activityOpen} title={editingActivity ? 'Edit Kegiatan' : 'Tambah Kegiatan'} onClose={() => { setActivityOpen(false); setEditingActivity(null) }}><form className="stack-form" onSubmit={saveActivity}><Input label="Judul" name="title" defaultValue={editingActivity?.title} required /><Textarea label="Deskripsi" name="description" defaultValue={editingActivity?.description ?? ''} /><Input label="Mulai" name="start_time" type="time" defaultValue={editingActivity?.start_time?.slice(0,5)} required /><Input label="Selesai" name="finish_time" type="time" defaultValue={editingActivity?.finish_time?.slice(0,5)} /><Input label="Lokasi" name="location_name" defaultValue={editingActivity?.location_name ?? ''} /><Button>{editingActivity ? 'Simpan Perubahan' : 'Tambah ke Timeline'}</Button></form></Modal>
  </main>
}

function CalendarView({ grouped, onSelect }: { grouped: Record<string, CoupleDate[]>; onSelect: (date: CoupleDate) => void }) {
  const [cursor, setCursor] = useState(() => { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1) })
  const year = cursor.getFullYear(); const month = cursor.getMonth(); const first = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate()
  const move = (offset: number) => setCursor(new Date(year, month + offset, 1))
  return <section className="calendar card"><div className="calendar-heading"><button onClick={() => move(-1)} aria-label="Bulan sebelumnya"><ChevronLeft /></button><h2>{cursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2><button onClick={() => move(1)} aria-label="Bulan berikutnya"><ChevronRight /></button></div><div className="calendar-grid">{['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((day) => <b key={day}>{day}</b>)}{Array.from({ length: first }).map((_, i) => <span key={`empty-${i}`} />)}{Array.from({ length: days }, (_, i) => i + 1).map((day) => { const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; return <button key={day} className={grouped[key]?.length ? 'has-date' : ''}><strong>{day}</strong>{grouped[key]?.map((date) => <span key={date.id} onClick={() => onSelect(date)}>❤️ {date.title}<small>⏰ {date.planned_start_time.slice(0,5)}</small></span>)}</button> })}</div></section>
}
