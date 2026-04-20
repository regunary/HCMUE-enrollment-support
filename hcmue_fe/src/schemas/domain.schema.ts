/**
 * English note: Validation schemas for core domain entities.
 */
import { z } from 'zod'

export const candidateSchema = z.object({
  idNumber: z.string().min(8, 'CCCD không hợp lệ.'),
  priorityRegion: z.string().min(1, 'Khu vực ưu tiên không được để trống.'),
  priorityGroup: z.string().min(1, 'Đối tượng ưu tiên không được để trống.'),
  graduationYear: z.number().int().min(1990, 'Năm tốt nghiệp không hợp lệ.'),
  scoreJson: z.string().min(2, 'Điểm môn không được để trống.'),
})

export const combinationSchema = z.object({
  code: z.string().min(1, 'Mã tổ hợp không được để trống.'),
  subjects: z.string().min(1, 'Môn của tổ hợp không được để trống.'),
  weights: z.string().min(1, 'Trọng số không được để trống.'),
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
