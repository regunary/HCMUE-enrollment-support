/**
 * English note: Login schema for mock role-based authentication.
 */
import { z } from 'zod'

export const loginSchema = z.object({
  role: z.enum(['admin', 'council', 'faculty'], {
    error: 'Vui lòng chọn vai trò đăng nhập.',
  }),
})

export type LoginInput = z.infer<typeof loginSchema>
