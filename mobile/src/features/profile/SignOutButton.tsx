import { useState } from 'react'
import { Button, ConfirmDialog } from '@/components'
import { useI18n } from '@/i18n'

/** Sign-out with a confirmation sheet. `onSignOut` clears SecureStore for that session; the root
 * layout's auth guard then returns to the sign-in chooser. Works offline (server revocation is
 * best-effort). */
export function SignOutButton({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onSignOut()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button label={t('profile.signOut')} variant="outline" icon="log-out-outline" onPress={() => setOpen(true)} fullWidth />
      <ConfirmDialog
        visible={open}
        title={t('profile.signOutTitle')}
        message={t('profile.signOutMessage')}
        confirmLabel={t('profile.signOut')}
        destructive
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
