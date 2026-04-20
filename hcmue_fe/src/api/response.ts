/**
 * English note: Normalize list payloads (raw array vs DRF paginated { results }) before Zod parse.
 */
import type { ZodType } from 'zod'

export function unwrapListPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.results)) {
      return o.results
    }
    if (Array.isArray(o.data)) {
      return o.data
    }
  }
  throw new Error('Định dạng danh sách từ API không hợp lệ (kỳ vọng mảng hoặc { results }).')
}

export function parseListWithSchema<T>(rows: unknown[], schema: ZodType<T>): T[] {
  return rows.map((row, index) => {
    const parsed = schema.safeParse(row)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.'
      throw new Error(`Bản ghi ${index + 1}: ${msg}`)
    }
    return parsed.data
  })
}
