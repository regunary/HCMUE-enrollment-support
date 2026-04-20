/**
 * English note: Tiny state helper for Zod-based form validation.
 */
import { useState } from 'react'
import type { ZodType } from 'zod'

export function useZodForm<T extends Record<string, unknown>>(initialValue: T, schema: ZodType<T>) {
  const [value, setValue] = useState<T>(initialValue)
  const [error, setError] = useState<string>('')

  const validate = () => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.')
      return null
    }
    setError('')
    return parsed.data
  }

  return { value, setValue, error, validate }
}
