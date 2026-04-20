import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logoImage from '../../assets/logo-hcmue.png'
import { Badge, Button, FormField, Select } from '../../components'
import { loginSchema } from '../../schemas/auth.schema'
import { useAuth } from './useAuth'
import type { UserRole } from '../../types/role'

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'council', label: 'Hội đồng tuyển sinh' },
  { value: 'faculty', label: 'Khoa' },
]

export function LoginPage() {
  const [role, setRole] = useState<UserRole>('admin')
  const [error, setError] = useState<string>('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = loginSchema.safeParse({ role })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.')
      return
    }
    setError('')
    login(parsed.data.role)
    navigate(from ?? `/dashboard/${parsed.data.role}`, { replace: true })
  }

  return (
    <section className="w-[min(440px,100%)] border border-border rounded-2xl bg-surface shadow-md p-6">
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-5">
        <img src={logoImage} alt="HCMUE" className="w-12 h-12 rounded-lg object-contain shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-primary m-0 leading-tight">Tuyển sinh</h1>
          <p className="text-[13px] text-muted m-0">HCMUE Enrollment System</p>
        </div>
      </div>

      <Badge>Đăng nhập mô phỏng</Badge>
      <h2 className="text-lg font-semibold mt-0 mb-1">Chọn vai trò để vào hệ thống</h2>
      <p className="text-sm text-muted mb-4">
        Bước đăng nhập giả lập trong giai đoạn phát triển frontend.
      </p>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <FormField label="Vai trò">
          <Select
            value={role}
            onChange={(v) => setRole(v as UserRole)}
            options={roleOptions}
          />
        </FormField>
        {error ? <p className="text-accent text-sm m-0">{error}</p> : null}
        <Button type="submit">Vào hệ thống</Button>
      </form>
    </section>
  )
}
