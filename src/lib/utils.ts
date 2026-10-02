export const formatDate = (value?: string | null) => {
  if (!value) return 'Belum ditentukan'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`))
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export const formatDuration = (start?: string | null, finish?: string | null) => {
  if (!start || !finish) return '—'
  const minutes = Math.max(0, Math.floor((new Date(finish).getTime() - new Date(start).getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours ? `${hours} jam ` : ''}${rest} menit`
}

export const countdown = (iso: string) => {
  const distance = new Date(iso).getTime() - Date.now()
  if (distance <= 0) return 'Waktunya date! ❤️'
  const days = Math.floor(distance / 86400000)
  const hours = Math.floor((distance % 86400000) / 3600000)
  const minutes = Math.floor((distance % 3600000) / 60000)
  return `${days} hari · ${hours} jam · ${minutes} menit`
}

export const mapsUrl = (name: string, latitude?: number | null, longitude?: number | null) =>
  latitude != null && longitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`

export const classNames = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')
