import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Heart, MapPin, Play, Plus, Trash2, UploadCloud, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button, EmptyState, Input, Modal, Stars, Textarea } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { useRecords } from '../hooks/useRecords'
import { withSignedUrls } from '../lib/photos'
import { deleteVideo, formatVideoDuration, uploadVideo, withVideoUrls } from '../lib/videos'
import { friendlyError, supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { Moment, Photo, Video } from '../types'

export function MemoriesPage() {
  const { user } = useAuth()
  const { records: moments, loading, refresh } = useRecords<Moment>('moments', 'date')
  const { records: rawPhotos } = useRecords<Photo>('photos')
  const { records: rawVideos, refresh: refreshVideos } = useRecords<Video>('videos')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'moments' | 'videos'>('moments')
  const [open, setOpen] = useState(params.get('new') === '1')
  const [videoOpen, setVideoOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [selected, setSelected] = useState<Moment | null>(null)
  const [playing, setPlaying] = useState<Video | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let current = true
    const sign = () => withSignedUrls(rawPhotos).then((next) => { if (current) setPhotos(next) }).catch((error) => toast.error(friendlyError(error)))
    void sign(); const timer = window.setInterval(sign, 45 * 60 * 1000)
    return () => { current = false; clearInterval(timer) }
  }, [rawPhotos])
  useEffect(() => {
    let current = true
    const sign = () => withVideoUrls(rawVideos).then((next) => { if (current) setVideos(next) }).catch((error) => toast.error(friendlyError(error)))
    void sign(); const timer = window.setInterval(sign, 45 * 60 * 1000)
    return () => { current = false; clearInterval(timer) }
  }, [rawVideos])
  useEffect(() => {
    if (!playing) return
    const renewed = videos.find(({ id }) => id === playing.id)
    if (renewed?.signedUrl && renewed.signedUrl !== playing.signedUrl) setPlaying(renewed)
  }, [videos, playing])
  const imageMap = useMemo(() => new Map(photos.map((photo) => [photo.id, photo.signedUrl])), [photos])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const payload = { title: String(form.get('title')), description: String(form.get('description')) || null, date: String(form.get('date')), location: String(form.get('location')) || null, photo_id: String(form.get('photo_id')) || null, image_url: null, rating, is_favorite: form.get('is_favorite') === 'on' }
    const { error } = await supabase.from('moments').insert(payload)
    if (error) return toast.error(friendlyError(error))
    toast.success('Favorite moment tersimpan ❤️'); setOpen(false); setParams({}); await refresh()
  }
  async function saveVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return
    const form = new FormData(event.currentTarget); const file = form.get('video')
    if (!(file instanceof File) || !file.size) return toast.error('Pilih video terlebih dahulu.')
    setBusy(true)
    try {
      await uploadVideo(file, user, { title: String(form.get('title')), caption: String(form.get('caption')), date: String(form.get('date')), location: String(form.get('location')), is_favorite: form.get('is_favorite') === 'on' })
      toast.success('Video moment tersimpan selamanya 🎥❤️'); setVideoOpen(false); await refreshVideos()
    } catch (error) { toast.error(friendlyError(error)) } finally { setBusy(false) }
  }
  async function favorite(moment: Moment) {
    const { error } = await supabase.from('moments').update({ is_favorite: !moment.is_favorite }).eq('id', moment.id)
    if (error) toast.error(friendlyError(error)); else await refresh()
  }
  async function favoriteVideo(video: Video) {
    const { error } = await supabase.from('videos').update({ is_favorite: !video.is_favorite }).eq('id', video.id)
    if (error) toast.error(friendlyError(error)); else { if (playing?.id === video.id) setPlaying({ ...video, is_favorite: !video.is_favorite }); await refreshVideos() }
  }
  async function remove(moment: Moment) {
    if (!confirm('Hapus memory ini? Foto gallery tidak akan ikut terhapus.')) return
    const { error } = await supabase.from('moments').delete().eq('id', moment.id)
    if (error) toast.error(friendlyError(error)); else { setSelected(null); await refresh() }
  }
  async function removeVideo(video: Video) {
    if (!confirm('Hapus video ini secara permanen?')) return
    try { await deleteVideo(video); setPlaying(null); toast.success('Video dan file penyimpanannya sudah dihapus.'); await refreshVideos() }
    catch (error) { toast.error(friendlyError(error)) }
  }

  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Stories worth remembering</p><h1>Favorite Moments ❤️</h1><p>Karena hal kecil bersamamu layak untuk selalu diingat.</p></div>{tab === 'moments' ? <Button onClick={() => setOpen(true)}><Plus /> Add Memory</Button> : <Button onClick={() => setVideoOpen(true)}><Plus /> Add Video</Button>}</header>

    <div className="segmented"><button className={tab === 'moments' ? 'active' : ''} onClick={() => setTab('moments')}>❤️ Moments</button><button className={tab === 'videos' ? 'active' : ''} onClick={() => setTab('videos')}>🎥 Video Moments</button></div>

    {tab === 'moments' ? (
      loading ? <div className="skeleton-list" /> : !moments.length ? <EmptyState icon="💗" title="Belum ada favorite moment." text="Ceritakan satu momen indah kita di sini." /> : <section className="moments-grid">{moments.map((moment) => <article className="moment-card" key={moment.id} onClick={() => setSelected(moment)}>{moment.photo_id && imageMap.get(moment.photo_id) ? <img src={imageMap.get(moment.photo_id)} alt={moment.title} loading="lazy" /> : <div className="moment-placeholder">♡</div>}<div><button className={`favorite ${moment.is_favorite ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); void favorite(moment) }}><Heart fill={moment.is_favorite ? 'currentColor' : 'none'} /></button><small>{formatDate(moment.date)}</small><h2>{moment.title}</h2><p>{moment.description}</p><span><MapPin /> {moment.location || 'Di dunia kecil kita'}</span><Stars value={moment.rating} /></div></article>)}</section>
    ) : (
      !videos.length ? <EmptyState icon="🎥" title="Belum ada video moment." text="Unggah video pertama kebersamaan kita." /> : <section className="video-grid">{videos.map((video) => <article className="video-card" key={video.id} onClick={() => setPlaying(video)}>
        <div className="video-thumb">{video.signedUrl ? <video src={`${video.signedUrl}#t=0.1`} preload="metadata" muted playsInline /> : <div className="moment-placeholder">🎞️</div>}<span className="video-play"><Play fill="currentColor" /></span>{video.duration_seconds != null && <b className="video-dur">{formatVideoDuration(video.duration_seconds)}</b>}{video.is_favorite && <Heart className="photo-heart" fill="currentColor" />}</div>
        <div className="video-meta"><small>{formatDate(video.date)}</small><h3>{video.title || 'Video kita ❤️'}</h3><span><MapPin /> {video.location || 'Di dunia kecil kita'}</span></div>
      </article>)}</section>
    )}

    <Modal open={open} title="Add Favorite Moment ❤️" onClose={() => { setOpen(false); setParams({}) }}><form className="stack-form" onSubmit={save}><Input label="Judul" name="title" placeholder="Our First Dinner Together ❤️" required /><Textarea label="Cerita kita" name="description" /><Input label="Tanggal" name="date" type="date" required /><Input label="Lokasi" name="location" /><label className="field"><span>Lampirkan foto dari Gallery</span><select className="input" name="photo_id"><option value="">Tanpa foto</option>{photos.map((photo) => <option value={photo.id} key={photo.id}>{photo.caption || formatDate(photo.date)}</option>)}</select></label><div className="rating-row"><span>Rating moment</span><Stars value={rating} onChange={setRating} /></div><label className="check-field"><input type="checkbox" name="is_favorite" defaultChecked /> Favorite moment ❤️</label><Button>Simpan Memory ❤️</Button></form></Modal>

    <Modal open={videoOpen} title="Tambah Video Moment 🎥" onClose={() => setVideoOpen(false)}><form className="stack-form" onSubmit={saveVideo}><label className="upload-zone"><input name="video" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" required /><UploadCloud /><strong>Pilih video kita</strong><span>MP4, WEBM, MOV, atau OGG · Maks. 200 MB</span></label><Input label="Judul" name="title" placeholder="Jalan sore bareng ❤️" /><Textarea label="Caption" name="caption" /><Input label="Tanggal" name="date" type="date" /><Input label="Lokasi" name="location" /><label className="check-field"><input type="checkbox" name="is_favorite" /> Favorite video ❤️</label><Button disabled={busy}>{busy ? 'Mengunggah video…' : 'Simpan Video ❤️'}</Button></form></Modal>

    <Modal open={Boolean(selected)} title={selected?.title ?? 'Memory'} onClose={() => setSelected(null)}>{selected && <div className="memory-detail">{selected.photo_id && imageMap.get(selected.photo_id) && <img src={imageMap.get(selected.photo_id)} alt={selected.title} />}<p>{selected.description}</p><p><MapPin /> {selected.location}</p><Stars value={selected.rating} /><Button variant="danger" onClick={() => remove(selected)}><Trash2 /> Hapus Memory</Button></div>}</Modal>

    <AnimatePresence>{playing && <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPlaying(null)}><button className="lightbox-close" aria-label="Tutup"><X /></button><motion.div className="lightbox-content" initial={{ scale: .92 }} animate={{ scale: 1 }} onClick={(event) => event.stopPropagation()}><video src={playing.signedUrl} controls autoPlay playsInline /><div><h2>{playing.title || 'Video kita ❤️'}</h2>{playing.caption && <p>{playing.caption}</p>}<p>{formatDate(playing.date)}</p><p><MapPin /> {playing.location || 'Lokasi tidak dicatat'}</p><div className="form-actions"><Button variant="danger" onClick={() => removeVideo(playing)}><Trash2 /> Hapus</Button><Button variant="secondary" onClick={() => favoriteVideo(playing)}><Heart fill={playing.is_favorite ? 'currentColor' : 'none'} /> {playing.is_favorite ? 'Favorite' : 'Jadikan Favorite'}</Button></div></div></motion.div></motion.div>}</AnimatePresence>
  </main>
}
