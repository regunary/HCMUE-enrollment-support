/**
 * Chuẩn hóa hiển thị kết quả import khi BE dùng kiểu "partial success":
 * HTTP 200 + success: true nhưng errors[] có phần tử.
 */
import type { ImportResultSummary } from './importEntity.types'

const MAX_ERROR_LINES = 12

function formatOneImportError(raw: Record<string, unknown>): string {
  const rowNum =
    typeof raw.row === 'number'
      ? raw.row
      : typeof raw.row === 'string'
        ? Number(raw.row)
        : Number.NaN
  const code = typeof raw.code === 'string' ? raw.code : ''
  const msg = typeof raw.message === 'string' ? raw.message : 'Lỗi không xác định'
  const identifier = raw.identifier
  let suffix = ''
  if (identifier && typeof identifier === 'object' && identifier !== null) {
    const field = 'field' in identifier ? String((identifier as Record<string, unknown>).field ?? '') : ''
    const value = 'value' in identifier ? String((identifier as Record<string, unknown>).value ?? '') : ''
    if (field || value) {
      suffix = ` — ${field}${value !== '' ? `: ${value}` : ''}`
    }
  }
  const rowLabel = Number.isFinite(rowNum) ? `Dòng ${rowNum}` : 'Lỗi'
  const codePart = code ? `[${code}] ` : ''
  return `${rowLabel}: ${codePart}${msg}${suffix}`
}

export type ImportToastPayload = {
  message: string
  kind: 'success' | 'error' | 'info'
}

/**
 * @param contextLabel — ví dụ "điểm THPT", "thông tin thí sinh"
 */
export function formatImportResultForToast(contextLabel: string, summary: ImportResultSummary): ImportToastPayload {
  const head = `${contextLabel}: thêm ${summary.created}, cập nhật ${summary.updated}, bỏ qua ${summary.skipped}.`
  const errors = summary.errors ?? []

  if (errors.length === 0) {
    const ok = summary.success !== false
    return {
      message: ok ? head : `${head}\n(success=false từ máy chủ.)`,
      kind: ok ? 'success' : 'info',
    }
  }

  const lines = errors.slice(0, MAX_ERROR_LINES).map((item) => formatOneImportError(item))
  const more =
    errors.length > MAX_ERROR_LINES ? `\n… và thêm ${errors.length - MAX_ERROR_LINES} lỗi (xem log/API).` : ''
  const detail = `\n\nChi tiết lỗi (${errors.length}):\n${lines.join('\n')}${more}`

  const noWrites = summary.created === 0 && summary.updated === 0
  const kind: ImportToastPayload['kind'] = noWrites ? 'error' : 'info'

  return {
    message: head + detail,
    kind,
  }
}
