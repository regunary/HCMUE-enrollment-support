/**
 * English note: Validation schemas for core domain entities.
 */
import { z } from 'zod'

export const candidateSchema = z.object({
  idNumber: z.string().min(8, 'CCCD không hợp lệ.'),
  priorityRegion: z.string().min(1, 'Khu vực ưu tiên không được để trống.'),
  priorityBonus: z.number().min(0, 'Điểm ưu tiên khu vực không hợp lệ.').default(0),
  // Backend accepts empty special_code; keep FE contract aligned.
  priorityGroup: z.string().default(''),
  graduationYear: z.number().int().min(1990, 'Năm tốt nghiệp không hợp lệ.'),
  academicLevel: z.string().min(1, 'Học lực lớp 12 không được để trống.').default('1'),
  graduationScore: z.number().min(0, 'Điểm tốt nghiệp không hợp lệ.').max(10, 'Điểm tốt nghiệp không hợp lệ.').default(0),
  scoreJson: z.string().min(2, 'Điểm môn không được để trống.'),
})

const WEIGHT_SUM_EPS = 1e-6

export const combinationSchema = z
  .object({
    code: z.string().min(1, 'Mã tổ hợp không được để trống.'),
    subjects: z.string().min(1, 'Môn của tổ hợp không được để trống.'),
    weights: z.string().min(1, 'Trọng số không được để trống.'),
  })
  .superRefine((data, ctx) => {
    const subjectIds = data.subjects
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const weightParts = data.weights
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    if (subjectIds.length !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tổ hợp bắt buộc đúng 3 môn (theo hồ sơ: M1, M2, M3).',
        path: ['subjects'],
      })
    }

    if (weightParts.length !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cần đúng 3 trọng số tương ứng 3 môn.',
        path: ['weights'],
      })
    }

    const weights = weightParts.map((part) => Number(part))
    if (weights.some((value) => !Number.isFinite(value) || value < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Trọng số phải là số không âm.',
        path: ['weights'],
      })
      return
    }

    const sum = weights.reduce((acc, value) => acc + value, 0)
    if (Math.abs(sum - 1) > WEIGHT_SUM_EPS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tổng trọng số phải bằng 1 (hiện tại ≈ ${sum.toFixed(4)}).`,
        path: ['weights'],
      })
    }
  })

export const subjectSchema = z.object({
  id: z.string().min(1, 'Mã môn không được để trống.'),
  name: z.string().min(1, 'Tên môn không được để trống.'),
})

export const majorSchema = z.object({
  code: z.string().min(1, 'Mã ngành không được để trống.'),
  name: z.string().min(1, 'Tên ngành không được để trống.'),
  combinations: z.string().min(1, 'Tổ hợp xét tuyển không được để trống.'),
})

export const wishSchema = z.object({
  idNumber: z.string().min(8, 'CCCD không hợp lệ.'),
  majorCode: z.string().min(1, 'Mã ngành không được để trống.'),
  order: z.number().int().min(1, 'Thứ tự nguyện vọng không hợp lệ.'),
})

export const exclusionSchema = z.object({
  idNumber: z.string().min(8, 'CCCD không hợp lệ.'),
  reason: z.string().min(1, 'Lý do loại bỏ không được để trống.'),
})

export const criteriaSchema = z.object({
  combinationCode: z.string().min(1, 'Mã tổ hợp không được để trống.'),
  rule: z.string().min(1, 'Điều kiện xét tuyển không được để trống.'),
})

export const cutoffSchema = z.object({
  majorCode: z.string().min(1, 'Mã ngành không được để trống.'),
  score: z.number().min(0, 'Điểm chuẩn không hợp lệ.'),
})
