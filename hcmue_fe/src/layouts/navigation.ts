/**
 * English note: Navigation model for the main application sidebar.
 */
import type { LucideIcon } from 'lucide-react'
import {
  BookCheck,
  ChartBar,
  ClipboardList,
  FileCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react'
import type { UserRole } from '../types/role'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

export type NavSection = {
  title: string
  items: NavItem[]
}

const importItems: NavItem[] = [
 
  { to: '/imports/candidate-regions', label: 'Khu vực ưu tiên', icon: UserCog },
  { to: '/imports/candidate-priority-objects', label: 'Đối tượng ưu tiên', icon: UserCog },
  { to: '/imports/candidates', label: 'Nhập thí sinh', icon: Users },
  { to: '/imports/subjects', label: 'Nhập môn học', icon: BookCheck },
  { to: '/imports/combinations', label: 'Nhập tổ hợp', icon: SlidersHorizontal },
  { to: '/imports/majors', label: 'Nhập ngành', icon: BookCheck },
  { to: '/imports/wishes', label: 'Nhập nguyện vọng', icon: ClipboardList },
  { to: '/imports/exclusions', label: 'Nhập loại bỏ', icon: UserCog },
  { to: '/imports/criteria', label: 'Điều kiện xét tuyển', icon: Target },
]

export const navByRole: Record<UserRole, NavSection[]> = {
  admin: [
    {
      title: 'Dashboard',
      items: [{ to: '/dashboard/admin', label: 'Tổng quan Admin', icon: LayoutDashboard }],
    },
    { title: 'Nhập liệu', items: importItems },
    {
      title: 'Phân tích',
      items: [
        { to: '/analytics/scoring', label: 'Tính điểm', icon: ChartBar },
        { to: '/analytics/distribution', label: 'Phổ điểm', icon: ChartBar },
        { to: '/analytics/percentile', label: 'Bách phân vị', icon: TrendingUp },
      ],
    },
    {
      title: 'Tuyển sinh',
      items: [
        { to: '/admission/cutoff', label: 'Điểm chuẩn', icon: FileSpreadsheet },
        { to: '/admission/results', label: 'Kết quả trúng tuyển', icon: FileCheck },
      ],
    },
  ],
  council: [
    {
      title: 'Dashboard',
      items: [{ to: '/dashboard/council', label: 'Tổng quan Hội đồng', icon: ShieldCheck }],
    },
    {
      title: 'Phân tích',
      items: [
        { to: '/analytics/scoring', label: 'Tính điểm', icon: ChartBar },
        { to: '/analytics/distribution', label: 'Phổ điểm', icon: ChartBar },
        { to: '/analytics/percentile', label: 'Bách phân vị', icon: TrendingUp },
      ],
    },
    {
      title: 'Tuyển sinh',
      items: [
        { to: '/admission/cutoff', label: 'Nhập điểm chuẩn', icon: FileSpreadsheet },
        { to: '/admission/results', label: 'Danh sách trúng tuyển', icon: FileCheck },
      ],
    },
  ],
  faculty: [
    {
      title: 'Dashboard',
      items: [{ to: '/dashboard/faculty', label: 'Tổng quan Khoa', icon: GraduationCap }],
    },
    {
      title: 'Theo dõi',
      items: [
        { to: '/analytics/distribution', label: 'Phổ điểm theo ngành', icon: ChartBar },
        { to: '/admission/cutoff', label: 'Điểm chuẩn theo ngành', icon: FileSpreadsheet },
      ],
    },
  ],
}
