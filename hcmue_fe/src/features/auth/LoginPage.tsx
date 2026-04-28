import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImage from '../../assets/logo-hcmue.png'
import { Badge, Button, FormField, Input } from '../../components'
import { loginSchema } from '../../schemas/auth.schema'
import { useAuth } from './useAuth'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = loginSchema.safeParse({ username, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await login(parsed.data.username, parsed.data.password)
      // Always reset entry point after a fresh login, avoid returning to stale page from prior role.
      navigate('/', { replace: true })
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : 'Đăng nhập thất bại.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
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

      <Badge>Đăng nhập hệ thống</Badge>
      <h2 className="text-lg font-semibold mt-0 mb-1">Đăng nhập vào hệ thống</h2>
      <p className="text-sm text-muted mb-4">
        Đăng nhập bằng tài khoản backend để truy cập theo vai trò.
      </p>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <FormField label="Tài khoản">
          <Input value={username} onChange={setUsername} placeholder="Nhập username" />
        </FormField>
        <FormField label="Mật khẩu">
          <input
            className="w-full border border-border rounded-md px-3 py-2 bg-surface"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
          />
        </FormField>
        {error ? <p className="text-accent text-sm m-0">{error}</p> : null}
        <Button type="submit">{submitting ? 'Đang đăng nhập...' : 'Vào hệ thống'}</Button>
      </form>
    </section>
  )
}
