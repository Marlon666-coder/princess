import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { GoogleMap, MarkerF, StandaloneSearchBox, useJsApiLoader } from '@react-google-maps/api'
import { ExternalLink, Heart, MapPin, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, EmptyState, Input, Modal, Select, Stars, Textarea } from '../components/UI'
import { useRecords } from '../hooks/useRecords'
import { friendlyError, supabase } from '../lib/supabase'
import { formatDate, mapsUrl } from '../lib/utils'
import type { Place, PlaceCategory } from '../types'

const libraries: ('places')[] = ['places']
const categories: PlaceCategory[] = ['restaurant', 'cafe', 'mall', 'cinema', 'park', 'entertainment', 'nature', 'other']
const emptyForm = { name: '', address: '', latitude: null as number | null, longitude: null as number | null, google_place_id: '', google_maps_url: '', category: 'cafe' as PlaceCategory, visit_date: '', review: '', rating_food: 0, rating_atmosphere: 0, rating_service: 0, rating_price: 0, rating_overall: 0, is_favorite: false }

export function PlacesPage() {
  const { records: places, loading, refresh } = useRecords<Place>('places')
  const [filter, setFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<Place | null>(null)
  const [editing, setEditing] = useState<Place | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const visible = places.filter((place) => filter === 'all' || (filter === 'favorite' ? place.is_favorite : place.category === filter))

  function openForm(place?: Place) {
    setEditing(place ?? null)
    setForm(place ? { name: place.name, address: place.address ?? '', latitude: place.latitude, longitude: place.longitude, google_place_id: place.google_place_id ?? '', google_maps_url: place.google_maps_url ?? '', category: place.category, visit_date: place.visit_date ?? '', review: place.review ?? '', rating_food: place.rating_food ?? 0, rating_atmosphere: place.rating_atmosphere ?? 0, rating_service: place.rating_service ?? 0, rating_price: place.rating_price ?? 0, rating_overall: place.rating_overall ?? 0, is_favorite: place.is_favorite } : emptyForm)
    setFormOpen(true)
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    const payload = { ...form, address: form.address || null, google_place_id: form.google_place_id || null, google_maps_url: form.google_maps_url || mapsUrl(form.name, form.latitude, form.longitude), visit_date: form.visit_date || null, review: form.review || null, rating_food: form.rating_food || null, rating_atmosphere: form.rating_atmosphere || null, rating_service: form.rating_service || null, rating_price: form.rating_price || null, rating_overall: form.rating_overall || null }
    const { error } = editing ? await supabase.from('places').update(payload).eq('id', editing.id) : await supabase.from('places').insert(payload)
    setBusy(false)
    if (error) return toast.error(friendlyError(error))
    toast.success('Tempat tersimpan di dunia kita ❤️'); setFormOpen(false); await refresh()
  }
  async function toggleFavorite(place: Place) {
    const { error } = await supabase.from('places').update({ is_favorite: !place.is_favorite }).eq('id', place.id)
    if (error) toast.error(friendlyError(error)); else { toast.success(!place.is_favorite ? 'Ditambahkan ke favorite ❤️' : 'Dihapus dari favorite'); await refresh() }
  }
  async function remove(place: Place) {
    if (!confirm(`Hapus ${place.name}?`)) return
    const { error } = await supabase.from('places').delete().eq('id', place.id)
    if (error) toast.error(friendlyError(error)); else { setSelected(null); await refresh() }
  }
  const rating = (key: keyof typeof form, label: string) => <div className="rating-row"><span>{label}</span><Stars value={Number(form[key])} onChange={(value) => setForm((current) => ({ ...current, [key]: value }))} /></div>

  return <main className="page">
    <header className="page-header"><div><p className="eyebrow">Our map of memories</p><h1>Places We've Been 📍</h1><p>Tempat biasa menjadi istimewa karena kita datang bersama.</p></div><Button onClick={() => openForm()}><Plus /> Add Place</Button></header>
    {!apiKey && <div className="notice"><MapPin /><div><strong>Google Maps belum diaktifkan</strong><p>Isi <code>VITE_GOOGLE_MAPS_API_KEY</code> untuk place search dan peta. Input manual serta link Google Maps tetap bekerja.</p></div></div>}
    <div className="filter-row">{['all','favorite',...categories].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'favorite' ? '❤️ Favorite' : item}</button>)}</div>
    {loading ? <div className="skeleton-list" /> : !visible.length ? <EmptyState icon="📍" title="Belum ada tempat di sini." text="Tambahkan tempat pertama yang ingin kita kunjungi." /> : <section className="places-grid">{visible.map((place) => <article className="place-card" key={place.id} onClick={() => setSelected(place)}><div className="place-visual"><MapPin /><button className={place.is_favorite ? 'favorite active' : 'favorite'} onClick={(event) => { event.stopPropagation(); void toggleFavorite(place) }}><Heart fill={place.is_favorite ? 'currentColor' : 'none'} /></button></div><div><span className="category-pill">{place.category}</span><h2>{place.name}</h2><p>{place.address || 'Alamat belum ditambahkan'}</p><div className="place-footer"><Stars value={place.rating_overall} /><small>{place.visit_date ? formatDate(place.visit_date) : 'Belum dikunjungi'}</small></div></div></article>)}</section>}

    <Modal open={formOpen} title={editing ? 'Edit Place 📍' : 'Add a Place 📍'} onClose={() => setFormOpen(false)} wide><form className="place-form" onSubmit={save}>
      {apiKey && <MapsFields apiKey={apiKey} form={form} setForm={setForm} />}
      <div className="form-grid"><Input label="Nama tempat" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Select label="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PlaceCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</Select><Input label="Alamat" className="span-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /><Input label="Tanggal kunjungan" type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /><label className="check-field"><input type="checkbox" checked={form.is_favorite} onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })} /> Favorite place ❤️</label></div>
      <div className="ratings"><h3>Rate this place</h3>{rating('rating_food','Food')}{rating('rating_atmosphere','Atmosphere')}{rating('rating_service','Service')}{rating('rating_price','Price')}{rating('rating_overall','Overall')}</div>
      <Textarea label="Review" value={form.review} onChange={(e) => setForm({ ...form, review: e.target.value })} placeholder="Tempatnya bagus banget, suasananya romantis…" />
      <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Batal</Button><Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Tempat ❤️'}</Button></div>
    </form></Modal>

    <Modal open={Boolean(selected)} title={selected?.name ?? 'Place'} onClose={() => setSelected(null)}>{selected && <div className="place-detail"><span className="category-pill">{selected.category}</span><p><MapPin /> {selected.address || 'Alamat belum ditambahkan'}</p><Stars value={selected.rating_overall} /><blockquote>{selected.review || 'Belum ada review.'}</blockquote><a className="button button-secondary" href={selected.google_maps_url || mapsUrl(selected.name, selected.latitude, selected.longitude)} target="_blank" rel="noreferrer"><ExternalLink /> Buka di Google Maps</a><div className="form-actions"><Button variant="danger" onClick={() => remove(selected)}><Trash2 /> Hapus</Button><Button onClick={() => { setSelected(null); openForm(selected) }}>Edit Place</Button></div></div>}</Modal>
  </main>
}

function MapsFields({ apiKey, form, setForm }: { apiKey: string; form: typeof emptyForm; setForm: Dispatch<SetStateAction<typeof emptyForm>> }) {
  const { isLoaded, loadError } = useJsApiLoader({ id: 'our-little-world-maps', googleMapsApiKey: apiKey, libraries })
  const searchBox = useRef<google.maps.places.SearchBox | null>(null)
  if (loadError) return <div className="error-banner span-2">Google Maps tidak dapat dimuat. Periksa API key, Places API, dan domain restriction.</div>
  if (!isLoaded) return <div className="map-loading span-2">Memuat Google Maps…</div>
  const pickGooglePlace = () => {
    const place = searchBox.current?.getPlaces()?.[0]
    if (!place) return
    const latitude = place.geometry?.location?.lat() ?? null
    const longitude = place.geometry?.location?.lng() ?? null
    setForm((current) => ({ ...current, name: place.name ?? current.name, address: place.formatted_address ?? current.address, latitude, longitude, google_place_id: place.place_id ?? '', google_maps_url: place.url ?? mapsUrl(place.name ?? current.name, latitude, longitude) }))
  }
  return <><label className="field span-2"><span>Cari di Google Maps</span><StandaloneSearchBox onLoad={(box) => { searchBox.current = box }} onPlacesChanged={pickGooglePlace}><div className="search-input"><Search /><input className="input" placeholder="Cari cafe, restaurant, atau tempat…" /></div></StandaloneSearchBox></label>{form.latitude != null && form.longitude != null && <GoogleMap mapContainerClassName="map-container" center={{ lat: form.latitude, lng: form.longitude }} zoom={15} options={{ disableDefaultUI: true, zoomControl: true }}><MarkerF position={{ lat: form.latitude, lng: form.longitude }} /></GoogleMap>}</>
}
