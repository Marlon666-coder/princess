import { CheckCircle2, Circle, Heart, MapPin } from 'lucide-react'
import { SakuraBackground } from './SakuraBackground'

// Status derived ONLY from presence — never render the actual secret values.
const hasSupabaseUrl = Boolean(import.meta.env.VITE_SUPABASE_URL?.trim())
const hasSupabaseKey = Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim())
const hasMapsKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim())

function StatusRow({ ready, label, hint, optional = false }: { ready: boolean; label: string; hint: string; optional?: boolean }) {
  return <li className={ready ? 'cfg-ready' : 'cfg-pending'}>
    {ready ? <CheckCircle2 /> : <Circle />}
    <div><strong>{label} {optional && <em>· opsional</em>}</strong><span>{hint}</span></div>
    <b className="cfg-pill">{ready ? 'Terisi' : 'Belum diisi'}</b>
  </li>
}

export function ConfigRequired() {
  return <main className="welcome-page config-page">
    <SakuraBackground dense />
    <section className="config-card">
      <div className="brand-mark"><Heart fill="currentColor" /></div>
      <p className="eyebrow">Our Little World</p>
      <h1>Hubungkan dunia kecil kita ❤️</h1>
      <p className="config-lead">Satu langkah kecil sebelum semua rencana, foto, dan kenangan kita tersimpan selamanya. Kita pakai Supabase asli—tidak ada penyimpanan palsu.</p>

      <ul className="config-status" aria-label="Status konfigurasi">
        <StatusRow ready={hasSupabaseUrl} label="Supabase URL" hint="VITE_SUPABASE_URL" />
        <StatusRow ready={hasSupabaseKey} label="Supabase Publishable Key" hint="VITE_SUPABASE_PUBLISHABLE_KEY" />
        <StatusRow ready={hasMapsKey} label="Google Maps Key" hint="VITE_GOOGLE_MAPS_API_KEY" optional />
      </ul>

      <div className="config-steps">
        <p className="eyebrow">Cara mengisi</p>
        <ol>
          <li>Salin <code>.env.example</code> menjadi <code>.env</code>.</li>
          <li>Isi <code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dari Supabase → Project Settings → API.</li>
          <li>Jalankan <code>supabase/migrations/001_initial_schema.sql</code> di Supabase SQL Editor.</li>
          <li>Simpan <code>.env</code>, lalu jalankan ulang <code>npm run dev</code>.</li>
        </ol>
      </div>

      <p className="config-note"><MapPin /> Begitu kedua credential Supabase terisi dan dev server dimuat ulang, halaman ini otomatis hilang dan kamu langsung masuk ke login.</p>
    </section>
  </main>
}
