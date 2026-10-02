import { useEffect, useState, type FormEvent } from 'react'
import { Calendar, Heart, MapPin, Plus, Trash2, UploadCloud, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button, EmptyState, Input, Modal } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { useRecords } from '../hooks/useRecords'
import { deletePhoto, uploadPhoto, withSignedUrls } from '../lib/photos'
import { friendlyError, supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { Photo } from '../types'

export function GalleryPage() {
  const { user } = useAuth()
  const { records, loading, refresh } = useRecords<Photo>('photos')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selected, setSelected] = useState<Photo | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    const sign = () => withSignedUrls(records).then((next) => { if (current) setPhotos(next) }).catch((error) => toast.error(friendlyError(error)))
    void sign()
    const timer = window.setInterval(sign, 45 * 60 * 1000)
    const onFocus = () => { if (document.visibilityState === 'visible') void sign() }
    document.addEventListener('visibilitychange', onFocus)
    return () => { current = false; clearInterval(timer); document.removeEventListener('visibilitychange', onFocus) }
  }, [records])
  useEffect(() => {
    if (!selected) return
    const renewed = photos.find(({ id }) => id === selected.id)
    if (renewed?.signedUrl && renewed.signedUrl !== selected.signedUrl) setSelected(renewed)
  }, [photos, selected])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const visible = favoritesOnly ? photos.filter((photo) => photo.is_favorite) : photos

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return
    const form = new FormData(event.currentTarget); const file = form.get('photo')
    if (!(file instanceof File) || !file.size) return toast.error('Pilih foto terlebih dahulu.')
    setBusy(true)
    try {
      await uploadPhoto(file, user, { caption: String(form.get('caption')), date: String(form.get('date')), location: String(form.get('location')) })
      toast.success('Memory saved forever 📸❤️'); setUploadOpen(false); setPreview(null); await refresh()
    } catch (error) { toast.error(friendlyError(error)) } finally { setBusy(false) }
  }
  async function favorite(photo: Photo) {
    const { error } = await supabase.from('photos').update({ is_favorite: !photo.is_favorite }).eq('id', photo.id)
    if (error) toast.error(friendlyError(error)); else { if (selected?.id === photo.id) setSelected({ ...photo, is_favorite: !photo.is_favorite }); await refresh() }
  }
  async function remove(photo: Photo) {
    if (!confirm('Hapus foto ini secara permanen?')) return
    try { await deletePhoto(photo); setSelected(null); toast.success('Foto dan file penyimpanannya sudah dihapus.'); await refresh() }
    catch (error) { toast.error(friendlyError(error)) }
  }

  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Saved forever</p><h1>Our Gallery 📸</h1><p>Potongan kecil dari cerita panjang kita.</p></div><Button onClick={() => setUploadOpen(true)}><Plus /> Upload Photo</Button></header>
    <div className="segmented"><button className={!favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly(false)}>All Photos</button><button className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly(true)}>❤️ Our Favorites</button></div>
    {loading ? <div className="gallery-skeleton" /> : !visible.length ? <EmptyState icon="📷" title="Belum ada foto di sini ❤️" text="Ayo simpan kenangan pertama kita." /> : <section className="gallery-grid">{visible.map((photo, index) => <motion.button layout className={`gallery-item item-${index % 7}`} key={photo.id} onClick={() => setSelected(photo)}><img src={photo.signedUrl} alt={photo.caption || 'Kenangan kita'} loading="lazy" /><span className="gallery-overlay"><strong>{photo.caption || 'Our moment ❤️'}</strong><small>{photo.location}</small></span>{photo.is_favorite && <Heart className="photo-heart" fill="currentColor" />}</motion.button>)}</section>}

    <Modal open={uploadOpen} title="Simpan Kenangan 📸" onClose={() => { setUploadOpen(false); setPreview(null) }}><form className="stack-form" onSubmit={submit}><label className="upload-zone"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required onChange={(event) => { const file = event.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : null) }} />{preview ? <img src={preview} alt="Preview upload" /> : <><UploadCloud /><strong>Pilih foto kita</strong><span>JPG, PNG, WEBP, atau GIF · Maks. 20 MB</span></>}</label><Input label="Caption" name="caption" placeholder="Hari yang sangat indah…" /><Input label="Tanggal" name="date" type="date" /><Input label="Lokasi" name="location" /><Button disabled={busy}>{busy ? 'Menyimpan selamanya…' : 'Simpan Memory ❤️'}</Button></form></Modal>

    <AnimatePresence>{selected && <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}><button className="lightbox-close" aria-label="Tutup"><X /></button><motion.div className="lightbox-content" initial={{ scale: .92 }} animate={{ scale: 1 }} onClick={(event) => event.stopPropagation()}><img src={selected.signedUrl} alt={selected.caption || 'Kenangan kita'} /><div><h2>{selected.caption || 'Our moment ❤️'}</h2><p><Calendar /> {formatDate(selected.date)}</p><p><MapPin /> {selected.location || 'Lokasi tidak dicatat'}</p><div className="form-actions"><Button variant="danger" onClick={() => remove(selected)}><Trash2 /> Hapus</Button><Button variant="secondary" onClick={() => favorite(selected)}><Heart fill={selected.is_favorite ? 'currentColor' : 'none'} /> {selected.is_favorite ? 'Favorite' : 'Jadikan Favorite'}</Button></div></div></motion.div></motion.div>}</AnimatePresence>
  </main>
}
