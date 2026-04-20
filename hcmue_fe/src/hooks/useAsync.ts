/**
 * English note: Basic async hook for loading data without external libraries.
 */
import { useCallback, useState } from 'react'

type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string
}

export function useAsync<T>(task: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: '',
  })

  const execute = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await task()
      setState({ data, loading: false, error: '' })
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi.'
      setState({ data: null, loading: false, error: message })
      return null
    }
  }, [task])

  return { ...state, execute }
}
