import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/supabase'
import { Button, Input } from '../components/UI'
import { SakuraBackground } from '../components/SakuraBackground'

export function WelcomePage() {
  const [entered, setEntered] = useState(false)
  const [busy, setBusy] = useState(false)
  const { signIn, authError } = useAuth()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true)
    try { await signIn(String(form.get('email')), String(form.get('password'))) }
    catch (error) { toast.error(friendlyError(error)) }
    finally { setBusy(false) }
  }

  return <main className="welcome-page">
    <SakuraBackground dense />
    <AnimatePresence mode="wait">
      {!entered ? <motion.section key="intro" className="welcome-content" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }}>
        <div className="heart-orbit"><Heart fill="currentColor" /></div><p className="eyebrow">Our Little World</p>
        <h1>Halo Sayangku<br /><em>Nasywa</em> ❤️</h1><p>Welcome to our little world.</p>
        <Button onClick={() => setEntered(true)}>Masuk ke Dunia Kita <Heart size={18} fill="currentColor" /></Button>
      </motion.section> : <motion.section key="login" className="auth-card" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}>
        <div className="brand-mark"><LockKeyhole /></div><p className="eyebrow">Private, just for us</p><h1>Selamat datang kembali ❤️</h1>
        <p>Masuk dengan akun private kita untuk membuka semua rencana dan kenangan.</p>
        {authError && <div className="error-banner">{authError}</div>}
        <form onSubmit={submit}><Input label="Email" name="email" type="email" autoComplete="email" required /><Input label="Password" name="password" type="password" minLength={6} autoComplete="current-password" required /><Button disabled={busy}>{busy ? 'Membuka…' : 'Masuk ❤️'}</Button></form>
        <small className="private-note">Pendaftaran publik sengaja dinonaktifkan. Buat akun pasangan dari Supabase Authentication agar dunia ini tetap private.</small>
      </motion.section>}
    </AnimatePresence>
  </main>
}
