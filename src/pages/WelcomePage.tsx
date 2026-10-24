import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/supabase'
import { Button, Input } from '../components/UI'
import { WelcomeScene } from '../components/WelcomeScene'
import { ThemeToggle } from '../components/ThemeToggle'
import { Magnetic } from '../components/motion'

type Stage = 'intro' | 'zooming' | 'login'

export function WelcomePage() {
  const [stage, setStage] = useState<Stage>('intro')
  const [busy, setBusy] = useState(false)
  const { signIn, authError } = useAuth()

  function enter() {
    setStage('zooming')
    // let the cinematic camera zoom settle on the couple, linger, then reveal login
    window.setTimeout(() => setStage('login'), 3000)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await signIn(String(form.get('email')), String(form.get('password')))
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  const zoomed = stage !== 'intro'

  return (
    <main className="welcome-page welcome-cinematic">
      <ThemeToggle floating />

      {/* The 3D cinematic scene fills the screen behind everything */}
      <div className="scene-layer" aria-hidden="true">
        <WelcomeScene zoom={zoomed} />
      </div>
      {/* Soft vignette so overlaid text stays readable */}
      <div className="scene-vignette" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.section
            key="intro"
            className="welcome-content scene-overlay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.5 } }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <p className="eyebrow eyebrow-glow">Our Little World</p>
            <h1 className="title-glow scene-title">
              Halo Sayangku<br />
              <em>Nasywa</em> <Heart className="title-heart" fill="currentColor" aria-label="love" />
            </h1>
            <p className="scene-tagline">Welcome to our little world.</p>
            <Magnetic strength={0.3}>
              <Button onClick={enter}>
                Masuk ke Dunia Kita <Heart size={18} fill="currentColor" />
              </Button>
            </Magnetic>
          </motion.section>
        )}

        {stage === 'zooming' && (
          <motion.div
            key="zooming"
            className="scene-overlay scene-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              <Heart fill="currentColor" />
            </motion.span>
          </motion.div>
        )}

        {stage === 'login' && (
          <motion.section
            key="login"
            className="auth-card scene-overlay"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="brand-mark"><LockKeyhole /></div>
            <p className="eyebrow">Private, just for us</p>
            <h1>
              Selamat datang kembali <Heart className="inline-heart" fill="currentColor" aria-label="love" />
            </h1>
            <p>Masuk dengan akun private kita untuk membuka semua rencana dan kenangan.</p>
            {authError && <div className="error-banner">{authError}</div>}
            <form onSubmit={submit}>
              <Input label="Email" name="email" type="email" autoComplete="email" required />
              <Input label="Password" name="password" type="password" minLength={6} autoComplete="current-password" required />
              <Button disabled={busy}>
                {busy ? 'Membuka…' : <>Masuk <Heart size={16} fill="currentColor" /></>}
              </Button>
            </form>
            <small className="private-note">
              Pendaftaran publik sengaja dinonaktifkan. Buat akun pasangan dari Supabase Authentication agar dunia ini tetap private.
            </small>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  )
}
