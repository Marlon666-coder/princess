import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = createClient(
  supabaseUrl || 'https://configuration-required.supabase.co',
  supabaseKey || 'configuration-required',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'our-little-world-auth',
    },
  },
)

export const PHOTO_BUCKET = 'couple-photos'

export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[Our Little World]', error)
  if (/fetch|network/i.test(message)) return 'Koneksi sedang bermasalah. Coba lagi sebentar ya ❤️'
  if (/invalid login/i.test(message)) return 'Email atau password belum tepat.'
  if (/row-level security|policy/i.test(message)) return 'Data ini tidak dapat diakses oleh akunmu.'
  if (/duplicate/i.test(message)) return 'Data tersebut sudah tersimpan.'
  return 'Ada yang belum berhasil. Silakan coba lagi ❤️'
}
