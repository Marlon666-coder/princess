import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import confetti from 'canvas-confetti'
import { History, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, EmptyState, Input, Modal, Select } from '../components/UI'
import { useRecords } from '../hooks/useRecords'
import { friendlyError, supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/utils'
import type { SpinHistory, WheelPlace } from '../types'

const colors = ['#f58ba9','#f7b7c8','#d8b4e8','#ffcfda','#ec789c','#cda7e5','#f9aeb8','#e989ae']

export function SpinPage() {
  const { records: places, loading, refresh } = useRecords<WheelPlace>('spin_wheel_places', 'created_at', true)
  const { records: history, refresh: refreshHistory } = useRecords<SpinHistory>('spin_history')
  const [open, setOpen] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<WheelPlace | null>(null)
  const timerRef = useRef<number | null>(null)
  useEffect(() => () => { if (timerRef.current != null) clearTimeout(timerRef.current) }, [])
  const active = places.filter((place) => place.is_active)
  const gradient = useMemo(() => active.length ? `conic-gradient(${active.map((_, index) => `${colors[index % colors.length]} ${index / active.length * 100}% ${(index + 1) / active.length * 100}%`).join(',')})` : '#fbd8e2', [active])

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const { error } = await supabase.from('spin_wheel_places').insert({ name: String(form.get('name')), category: String(form.get('category')), is_active: true })
    if (error) return toast.error(friendlyError(error))
    setOpen(false); toast.success('Pilihan ditambahkan ke wheel 🎡'); await refresh()
  }
  async function remove(place: WheelPlace) {
    if (spinning) return
    const { error } = await supabase.from('spin_wheel_places').delete().eq('id', place.id)
    if (error) toast.error(friendlyError(error)); else await refresh()
  }
  function spin() {
    if (active.length < 2) return toast.error('Tambahkan minimal dua tempat dulu sebelum kita spin! 🎡')
    if (spinning) return
    const index = Math.floor(Math.random() * active.length)
    const segment = 360 / active.length
    const currentNormalized = ((rotation % 360) + 360) % 360
    const desired = 360 - (index * segment + segment / 2)
    const extra = 1800 + ((desired - currentNormalized + 360) % 360)
    const nextRotation = rotation + extra
    const selected = active[index]
    setWinner(null); setSpinning(true); setRotation(nextRotation)
    timerRef.current = window.setTimeout(async () => {
      setWinner(selected); setSpinning(false); timerRef.current = null
      confetti({ particleCount: 130, spread: 85, origin: { y: .65 }, colors: ['#f58ba9','#d8b4e8','#ffffff','#ffcfda'] })
      const { error } = await supabase.from('spin_history').insert({ place_id: selected.id, selected_place_name: selected.name })
      if (error) toast.error(friendlyError(error)); else await refreshHistory()
    }, 4200)
  }
  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Let fate plan our date</p><h1>Spin The Wheel 🎡</h1><p>Kalau bingung mau ke mana, biarkan dunia kecil kita memilih.</p></div><Button disabled={spinning} onClick={() => setOpen(true)}><Plus /> Add Place</Button></header>
    <div className="spin-layout"><section className="wheel-section card">{loading ? <div className="wheel-placeholder" /> : !active.length ? <EmptyState icon="🎡" title="Tambahkan tempat dulu sebelum kita spin!" text="Cafe, cinema, restaurant, park—semuanya boleh." /> : <><div className="wheel-wrap"><div className="wheel-pointer">▼</div><div className="wheel" style={{ background: gradient, transform: `rotate(${rotation}deg)` }}>{active.map((place, index) => { const angle = (index + .5) * (360 / active.length); return <span key={place.id} style={{ transform: `rotate(${angle}deg) translateY(-42%)` }}><b style={{ transform: `rotate(${-angle}deg)` }}>{place.name}</b></span> })}<i>❤️</i></div></div><Button className="spin-button" disabled={spinning} onClick={spin}>{spinning ? "Let's see where we're going!" : 'SPIN ❤️'}</Button>{winner && <div className="winner"><small>We're going to…</small><strong>{winner.name}</strong><span>🎉</span></div>}</>}</section>
      <aside className="spin-side"><section className="card"><div className="section-title"><h2>Wheel Places</h2><span>{active.length}</span></div><div className="wheel-list">{places.map((place) => <div key={place.id}><span style={{ background: colors[places.indexOf(place) % colors.length] }} /><div><strong>{place.name}</strong><small>{place.category}</small></div><button disabled={spinning} onClick={() => remove(place)} aria-label={`Hapus ${place.name}`}><Trash2 /></button></div>)}</div></section><section className="card"><div className="section-title"><h2><History /> Spin History</h2></div>{!history.length ? <p className="muted">Belum ada hasil spin.</p> : <div className="history-list">{history.slice(0,8).map((item) => <div key={item.id}><span>🎡</span><div><strong>{item.selected_place_name}</strong><small>{formatDateTime(item.created_at)}</small></div></div>)}</div>}</section></aside>
    </div>
    <Modal open={open} title="Add to the Wheel 🎡" onClose={() => setOpen(false)}><form className="stack-form" onSubmit={add}><Input label="Nama tempat / aktivitas" name="name" placeholder="Cafe, Bowling, Cinema…" required /><Select label="Kategori" name="category"><option>Cafe</option><option>Restaurant</option><option>Cinema</option><option>Mall</option><option>Park</option><option>Entertainment</option><option>Other</option></Select><Button>Tambahkan ❤️</Button></form></Modal>
  </main>
}
