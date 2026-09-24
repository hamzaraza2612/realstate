import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractErrorMessage } from '@/lib/portalApiClient'
import { usePortalAuthStore } from '@/stores/portalAuthStore'
import { PortalActorTypeHomePath } from '@/types/api'
import { usePortalLogin } from './api'

const schema = z.object({
  tenantSlug: z.string().min(1, 'Organization is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function PortalLoginPage() {
  const accessToken = usePortalAuthStore((s) => s.accessToken)
  const profile = usePortalAuthStore((s) => s.profile)
  const setSession = usePortalAuthStore((s) => s.setSession)
  const navigate = useNavigate()
  const login = usePortalLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (accessToken && profile) {
    return <Navigate to={PortalActorTypeHomePath[profile.actorType]} replace />
  }

  async function onSubmit(values: FormValues) {
    try {
      const result = await login.mutateAsync(values)
      setSession(result)
      navigate(PortalActorTypeHomePath[result.profile.actorType], { replace: true })
    } catch (error) {
      // Deliberately generic — never reveal which of organization/email/password was wrong.
      setError('root', { message: extractErrorMessage(error, 'Invalid organization, email, or password.') })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            E
          </div>
          <CardTitle>Sign in to your portal</CardTitle>
          <CardDescription>View your bookings, payments, and documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenantSlug">Organization</Label>
              <Input id="tenantSlug" placeholder="your-company" autoComplete="organization" {...register('tenantSlug')} />
              <p className="text-xs text-muted-foreground">
                The short organization ID from your invite email — not your company's full name.
              </p>
              {errors.tenantSlug && <p className="text-xs text-destructive">{errors.tenantSlug.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" className="mt-2" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
