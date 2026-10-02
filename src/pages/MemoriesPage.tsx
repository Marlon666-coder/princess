import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Heart, MapPin, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EmptyState, Input, Modal, Stars, Textarea } from '../components/UI'
import { useRecords } from '../hooks/useRecords'
import { withSignedUrls } from '../lib/photos'
import { friendlyError, supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { Moment, Photo } from '../types'

export function MemoriesPage() {
  const { records: moments, loading, refresh } = useRecords<Moment>('moments', 'date')
  const { records: rawPhotos } = useRecords<Photo>('photos')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(params.get('new') === '1')
  const [rating, setRating] = useState(5)
  const [selected, setSelected] = useState<Moment | null>(null)
  useEffect(() => {
    let current = true
    const sign = () => withSignedUrls(rawPhotos).then((next) => { if (current) setPhotos(next) }).catch((error) => toast.error(friendlyError(error)))
    void sign(); const timer = window.setInterval(sign, 45 * 60 * 1000)
    return () => { current = false; clearInterval(timer) }
  }, [rawPhotos])
  const imageMap = useMemo(() => new Map(photos.map((photo) => [photo.id, photo.signedUrl])), [photos])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const payload = { title: String(form.get('title')), description: String(form.get('description')) || null, date: String(form.get('date')), location: String(form.get('location')) || null, photo_id: String(form.get('photo_id')) || null, image_url: null, rating, is_favorite: form.get('is_favorite') === 'on' }
    const { error } = await supabase.from('moments').insert(payload)
    if (error) return toast.error(friendlyError(error))
    toast.success('Favorite moment tersimpan ❤️'); setOpen(false); setParams({}); await refresh()
  }
  async function favorite(moment: Moment) {
    const { error } = await supabase.from('moments').update({ is_favorite: !moment.is_favorite }).eq('id', moment.id)
    if (error) toast.error(friendlyError(error)); else await refresh()
  }
  async function remove(moment: Moment) {
    if (!confirm('Hapus memory ini? Foto gallery tidak akan ikut terhapus.')) return
    const { error } = await supabase.from('moments').delete().eq('id', moment.id)
    if (error) toast.error(friendlyError(error)); else { setSelected(null); await refresh() }
  }
  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Stories worth remembering</p><h1>Favorite Moments ❤️</h1><p>Karena hal kecil bersamamu layak untuk selalu diingat.</p></div><Button onClick={() => setOpen(true)}><Plus /> Add Memory</Button></header>
    {loading ? <div className="skeleton-list" /> : !moments.length ? <EmptyState icon="💗" title="Belum ada favorite moment." text="Ceritakan satu momen indah kita di sini." /> : <section className="moments-grid">{moments.map((moment) => <article className="moment-card" key={moment.id} onClick={() => setSelected(moment)}>{moment.photo_id && imageMap.get(moment.photo_id) ? <img src={imageMap.get(moment.photo_id)} alt={moment.title} loading="lazy" /> : <div className="moment-placeholder">♡</div>}<div><button className={`favorite ${moment.is_favorite ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); void favorite(moment) }}><Heart fill={moment.is_favorite ? 'currentColor' : 'none'} /></button><small>{formatDate(moment.date)}</small><h2>{moment.title}</h2><p>{moment.description}</p><span><MapPin /> {moment.location || 'Di dunia kecil kita'}</span><Stars value={moment.rating} /></div></article>)}</section>}
    <Modal open={open} title="Add Favorite Moment ❤️" onClose={() => { setOpen(false); setParams({}) }}><form className="stack-form" onSubmit={save}><Input label="Judul" name="title" placeholder="Our First Dinner Together ❤️" required /><Textarea label="Cerita kita" name="description" /><Input label="Tanggal" name="date" type="date" required /><Input label="Lokasi" name="location" /><label className="field"><span>Lampirkan foto dari Gallery</span><select className="input" name="photo_id"><option value="">Tanpa foto</option>{photos.map((photo) => <option value={photo.id} key={photo.id}>{photo.caption || formatDate(photo.date)}</option>)}</select></label><div className="rating-row"><span>Rating moment</span><Stars value={rating} onChange={setRating} /></div><label className="check-field"><input type="checkbox" name="is_favorite" defaultChecked /> Favorite moment ❤️</label><Button>Simpan Memory ❤️</Button></form></Modal>
    <Modal open={Boolean(selected)} title={selected?.title ?? 'Memory'} onClose={() => setSelected(null)}>{selected && <div className="memory-detail">{selected.photo_id && imageMap.get(selected.photo_id) && <img src={imageMap.get(selected.photo_id)} alt={selected.title} />}<p>{selected.description}</p><p><MapPin /> {selected.location}</p><Stars value={selected.rating} /><Button variant="danger" onClick={() => remove(selected)}><Trash2 /> Hapus Memory</Button></div>}</Modal>
  </main>
}
