import type { User } from '@supabase/supabase-js'
import { VIDEO_BUCKET, supabase } from './supabase'
import type { Video } from '../types'

const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB, matches bucket limit
const ALLOWED = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const element = document.createElement('video')
      element.preload = 'metadata'
      const url = URL.createObjectURL(file)
      element.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(element.duration) ? Math.round(element.duration) : null) }
      element.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      element.src = url
    } catch { resolve(null) }
  })
}

export async function uploadVideo(file: File, user: User, metadata: { title?: string; caption?: string; date?: string; location?: string; is_favorite?: boolean }): Promise<Video> {
  if (!file.type.startsWith('video/') || !ALLOWED.includes(file.type)) throw new Error('Format video harus MP4, WEBM, MOV, atau OGG.')
  if (file.size > MAX_VIDEO_BYTES) throw new Error('Ukuran video maksimal 200 MB.')
  const duration = await readDuration(file)
  const now = new Date()
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
  const path = `${user.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (uploadError) throw uploadError
  const { data, error: metadataError } = await supabase.from('videos').insert({
    storage_path: path, title: metadata.title || null, caption: metadata.caption || null,
    date: metadata.date || null, location: metadata.location || null,
    duration_seconds: duration, is_favorite: metadata.is_favorite ?? false,
  }).select().single()
  if (metadataError) {
    const { error: rollbackError } = await supabase.storage.from(VIDEO_BUCKET).remove([path])
    if (rollbackError) throw new Error(`Metadata gagal disimpan dan cleanup Storage perlu diulang: ${rollbackError.message}`)
    throw metadataError
  }
  return data as Video
}

export async function withVideoUrls(videos: Video[]): Promise<Video[]> {
  if (!videos.length) return []
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrls(videos.map(({ storage_path }) => storage_path), 3600)
  if (error) throw error
  return videos.map((video, index) => ({ ...video, signedUrl: data[index]?.signedUrl ?? undefined }))
}

export async function deleteVideo(video: Video): Promise<void> {
  const { error: storageError } = await supabase.storage.from(VIDEO_BUCKET).remove([video.storage_path])
  if (storageError) throw storageError
  const { error: databaseError } = await supabase.from('videos').delete().eq('id', video.id)
  if (databaseError) {
    const { error: retryError } = await supabase.from('videos').delete().eq('id', video.id)
    if (retryError) throw new Error(`File sudah terhapus, tetapi metadata perlu dibersihkan: ${retryError.message}`)
  }
}

export const formatVideoDuration = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(seconds)) return ''
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
