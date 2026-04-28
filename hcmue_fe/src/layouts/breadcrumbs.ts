/**
 * English note: Maps pathname to concise Vietnamese page titles.
 */

const pathTitleMap: Record<string, string> = {
  '/': 'Trang chủ',
  '/dashboard/admin': 'Tổng quan Admin',
  '/dashboard/council': 'Tổng quan Hội đồng',
  '/dashboard/faculty': 'Tổng quan Khoa',
  '/imports/candidates': 'Nhập thí sinh',
  '/imports/candidate-regions': 'Khu vực ưu tiên',
  '/imports/candidate-priority-objects': 'Đối tượng ưu tiên',
  '/imports/combinations': 'Nhập tổ hợp',
  '/imports/majors': 'Nhập ngành',
  '/imports/wishes': 'Nhập nguyện vọng',
  '/imports/exclusions': 'Danh sách loại bỏ',
  '/imports/criteria': 'Điều kiện xét tuyển',
  '/analytics/scoring': 'Tính điểm',
  '/analytics/distribution': 'Phổ điểm',
  '/analytics/percentile': 'Bách phân vị',
  '/admission/cutoff': 'Điểm chuẩn',
  '/admission/results': 'Kết quả trúng tuyển',
}

export function getPageTitle(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return pathTitleMap[normalized] ?? pathTitleMap[pathname] ?? 'Trang chính'
}
