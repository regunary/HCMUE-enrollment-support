/**
 * English note: Shared role models used for route authorization and menu rendering.
 */
export type UserRole = 'admin' | 'council' | 'faculty'

export const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  council: 'Hội đồng tuyển sinh',
  faculty: 'Khoa',
}
