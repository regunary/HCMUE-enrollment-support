/**
 * Chuẩn khóa điểm trong scoreJson khớp cột import Excel phía BE (THPT: TO, VA…;
 * ĐGNL: *_NL; học bạ: *_HB; năng khiếu: NK2…).
 */

export function subjectScoreTypeToDisplayKey(subjectId: string, scoreType: string): string {
  const s = String(subjectId).trim().toUpperCase()
  const t = String(scoreType).trim().toUpperCase()
  if (!s) {
    return t ? `_${t}` : ''
  }
  if (t === 'DGNL') {
    return `${s}_NL`
  }
  if (t === 'HOCBA') {
    return `${s}_HB`
  }
  if (t === 'CB') {
    return s
  }
  if (t === 'THPT') {
    return s
  }
  return `${s}_${t}`
}

/**
 * Parse một khóa trong object scoreJson → mã môn + score_type gửi API.
 */
export function displayScoreKeyToParts(rawKey: string): { subjectId: string; scoreType: string } | null {
  const k = rawKey.trim().toUpperCase()
  if (!k) {
    return null
  }
  if (k.endsWith('_NL')) {
    const sub = k.slice(0, -3)
    return sub.length ? { subjectId: sub, scoreType: 'DGNL' } : null
  }
  if (k.endsWith('_HB')) {
    const sub = k.slice(0, -3)
    return sub.length ? { subjectId: sub, scoreType: 'HOCBA' } : null
  }
  if (k.endsWith('_HOCBA')) {
    const sub = k.slice(0, -6)
    return sub.length ? { subjectId: sub, scoreType: 'HOCBA' } : null
  }
  if (k.endsWith('_THPT')) {
    const sub = k.slice(0, -5)
    return sub.length ? { subjectId: sub, scoreType: 'THPT' } : null
  }
  if (k.endsWith('_DGNL')) {
    const sub = k.slice(0, -5)
    return sub.length ? { subjectId: sub, scoreType: 'DGNL' } : null
  }
  if (/^NK\d+$/i.test(k)) {
    return { subjectId: k, scoreType: 'CB' }
  }
  if (/^[A-Z][A-Z0-9]*$/i.test(k)) {
    return { subjectId: k, scoreType: 'THPT' }
  }
  return null
}

/** Điểm THPT cho môn trong tổ hợp: ưu tiên khóa TO, fallback TO_THPT (dữ liệu cũ). */
export function thptScoreForCombinationSubject(scoreMap: Record<string, number>, subject: string): number {
  const s = subject.trim().toUpperCase()
  if (Object.prototype.hasOwnProperty.call(scoreMap, s)) {
    return scoreMap[s] ?? 0
  }
  const legacy = `${s}_THPT`
  if (Object.prototype.hasOwnProperty.call(scoreMap, legacy)) {
    return scoreMap[legacy] ?? 0
  }
  return 0
}
