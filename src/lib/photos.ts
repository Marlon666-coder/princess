import type { User } from '@supabase/supabase-js'
import { PHOTO_BUCKET, supabase } from './supabase'
import type { Photo } from '../types'

const MAX_INPUT_BYTES = 20 * 1024 * 1024

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar yang valid.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('Ukuran foto maksimal 20 MB.')
  if (file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const maxSide = 2200
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) { bitmap.close(); throw new Error('Browser tidak dapat memproses foto ini.') }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Foto gagal diproses.')), 'image/webp', .84))
}

export async function uploadPhoto(file: File, user: User, metadata: { caption?: string; date?: string; location?: string; is_favorite?: boolean }): Promise<Photo> {
  const blob = await compressImage(file)
  const now = new Date()
  const extension = file.type === 'image/gif' ? 'gif' : 'webp'
  const path = `${user.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (uploadError) throw uploadError
  const { data, error: metadataError } = await supabase.from('photos').insert({ storage_path: path, image_url: null, caption: metadata.caption || null, date: metadata.date || null, location: metadata.location || null, is_favorite: metadata.is_favorite ?? false }).select().single()
  if (metadataError) {
    const { error: rollbackError } = await supabase.storage.from(PHOTO_BUCKET).remove([path])
    if (rollbackError) throw new Error(`Metadata gagal disimpan dan cleanup Storage perlu diulang: ${rollbackError.message}`)
    throw metadataError
  }
  return data as Photo
}

export async function withSignedUrls(photos: Photo[]): Promise<Photo[]> {
  if (!photos.length) return []
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(photos.map(({ storage_path }) => storage_path), 3600)
  if (error) throw error
  return photos.map((photo, index) => ({ ...photo, signedUrl: data[index]?.signedUrl }))
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path])
  if (storageError) throw storageError
  const { error: databaseError } = await supabase.from('photos').delete().eq('id', photo.id)
  if (databaseError) {
    const { error: retryError } = await supabase.from('photos').delete().eq('id', photo.id)
    if (retryError) throw new Error(`File sudah terhapus, tetapi metadata perlu dibersihkan: ${retryError.message}`)
  }
}
