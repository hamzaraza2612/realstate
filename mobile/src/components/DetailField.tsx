import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useI18n } from '@/i18n'
import { HIT_TARGET, spacing, useTheme } from '@/theme'
import { callPhone, sendEmail } from '@/utils/deviceActions'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'
import { useToast } from './Toast'

/**
 * Label/value pair for a record's detail screen (generalized from the approval detail's `Field`).
 * `value` may be a string or a node (e.g. a `StatusBadge`); empty strings render as an em dash.
 */
export function DetailField({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' || value == null ? (
        <Text variant={mono ? 'mono' : 'body'} selectable>
          {value === '' || value == null ? '—' : String(value)}
        </Text>
      ) : (
        value
      )}
    </View>
  )
}

/** A detail field whose value is a tappable link (opens another record, or a device app). */
export function LinkField({ label, value, icon, onPress, accessibilityHint }: { label: string; value: string; icon?: IconName; onPress: () => void; accessibilityHint?: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.field}>
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
      >
        {icon ? <Icon name={icon} size={16} color={colors.primary} /> : null}
        <Text variant="body" color="primary" style={styles.linkText}>
          {value}
        </Text>
      </Pressable>
    </View>
  )
}

/** Phone / email fields that hand off to the dialer / mail app (`tel:` / `mailto:`). */
export function ContactField({ kind, label, value }: { kind: 'phone' | 'email'; label: string; value: string | null | undefined }) {
  const { t } = useI18n()
  const toast = useToast()
  if (!value) return <DetailField label={label} value={null} />
  async function onPress() {
    const opened = kind === 'phone' ? await callPhone(value!) : await sendEmail(value!)
    if (!opened) toast({ title: kind === 'phone' ? t('contact.cannotCall') : t('contact.cannotEmail'), variant: 'error' })
  }
  return (
    <LinkField
      label={label}
      value={value}
      icon={kind === 'phone' ? 'call-outline' : 'mail-outline'}
      onPress={onPress}
      accessibilityHint={kind === 'phone' ? t('contact.callHint') : t('contact.emailHint')}
    />
  )
}

/** Big "Call" / "Email" buttons for the top of a person's detail screen (field-friendly targets). */
export function ContactButtons({ phone, email }: { phone?: string | null; email?: string | null }) {
  const { t } = useI18n()
  const toast = useToast()
  if (!phone && !email) return null
  return (
    <View style={styles.buttons}>
      {phone ? (
        <Button
          label={t('contact.call')}
          icon="call"
          style={styles.flex}
          onPress={async () => {
            if (!(await callPhone(phone))) toast({ title: t('contact.cannotCall'), variant: 'error' })
          }}
        />
      ) : null}
      {email ? (
        <Button
          label={t('contact.email')}
          icon="mail"
          variant="outline"
          style={styles.flex}
          onPress={async () => {
            if (!(await sendEmail(email))) toast({ title: t('contact.cannotEmail'), variant: 'error' })
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: HIT_TARGET - 12, alignSelf: 'flex-start' },
  linkText: { textDecorationLine: 'underline' },
  buttons: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
})
