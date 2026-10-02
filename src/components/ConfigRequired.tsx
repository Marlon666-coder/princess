import { KeyRound } from 'lucide-react'

export function ConfigRequired() {
  return <main className="center-page config-card">
    <div className="brand-mark"><KeyRound /></div>
    <p className="eyebrow">Satu langkah lagi</p>
    <h1>Hubungkan dunia kecil kita ❤️</h1>
    <p>Isi credential Supabase agar login dan semua kenangan tersimpan permanen. Aplikasi tidak menggunakan penyimpanan palsu.</p>
    <ol>
      <li>Salin <code>.env.example</code> menjadi <code>.env</code>.</li>
      <li>Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dari Supabase → Project Settings → API.</li>
      <li>Jalankan SQL di <code>supabase/migrations/001_initial_schema.sql</code> melalui Supabase SQL Editor.</li>
      <li>Opsional: isi <code>VITE_GOOGLE_MAPS_API_KEY</code> dari Google Cloud Console.</li>
    </ol>
  </main>
}
