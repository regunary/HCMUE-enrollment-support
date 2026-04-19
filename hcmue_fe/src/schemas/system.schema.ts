/**
 * Base Zod schemas for future enrollment module validation.
 */
import { z } from 'zod'

export const systemStatusSchema = z.object({
  systemName: z.string().min(1, 'Tên hệ thống không được để trống.'),
  version: z.string().min(1, 'Phiên bản không được để trống.'),
})

export type SystemStatus = z.infer<typeof systemStatusSchema>
