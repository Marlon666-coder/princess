import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRecords<T>(table: string, orderColumn = 'created_at', ascending = false) {
  const [records, setRecords] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestId = useRef(0)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current
    if (mounted.current) setLoading(true)
    const { data, error: queryError } = await supabase.from(table).select('*').order(orderColumn, { ascending })
    if (!mounted.current || currentRequest !== requestId.current) return
    if (queryError) setError(queryError)
    else { setRecords((data ?? []) as T[]); setError(null) }
    setLoading(false)
  }, [ascending, orderColumn, table])

  useEffect(() => {
    mounted.current = true; void refresh()
    return () => { mounted.current = false; requestId.current += 1 }
  }, [refresh])
  return { records, loading, error, refresh, setRecords }
}
