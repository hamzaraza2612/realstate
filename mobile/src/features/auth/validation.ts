import type { TFunction } from '@/i18n'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function requiredError(value: string, t: TFunction): string | undefined {
  return value.trim() ? undefined : t('auth.errors.required')
}

export function emailError(value: string, t: TFunction): string | undefined {
  if (!value.trim()) return t('auth.errors.required')
  return EMAIL_RE.test(value.trim()) ? undefined : t('auth.errors.invalidEmail')
}
