/**
 * English note: Login schema for username/password authentication.
 */
import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tài khoản.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
})

export type LoginInput = z.infer<typeof loginSchema>
