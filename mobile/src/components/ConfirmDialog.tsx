import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme } from '@/theme'
import { Button } from './Button'
import { Input } from './Input'
import { Text } from './Text'

/**
 * Confirmation as a bottom sheet (the mobile replacement for the web `ConfirmDialog`/`Dialog`).
 *
 * Chosen over the native `Alert` because (a) approval decisions need an optional comments field,
 * which `Alert` can't host cross-platform, (b) the destructive action gets a clearly red,
 * full-width button rather than a platform-styled text button, and (c) `Alert.alert` is a no-op on
 * react-native-web, so the web preview would silently skip every confirm.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  loading,
  disabled,
  disabledReason,
  withComments,
  commentsPlaceholder,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  title: string
  message?: string
  confirmLabel: string
  destructive?: boolean
  loading?: boolean
  /** e.g. offline — the confirm button is disabled and `disabledReason` is shown. */
  disabled?: boolean
  disabledReason?: string
  withComments?: boolean
  commentsPlaceholder?: string
  onConfirm: (comments: string) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [comments, setComments] = useState('')

  useEffect(() => {
    if (!visible) setComments('')
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onCancel} accessibilityLabel={t('common.cancel')} />
        <View
          style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          accessibilityViewIsModal
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          {message ? (
            <Text variant="body" color="mutedForeground">
              {message}
            </Text>
          ) : null}
          {withComments ? (
            <Input value={comments} onChangeText={setComments} placeholder={commentsPlaceholder} multiline numberOfLines={3} />
          ) : null}
          {disabled && disabledReason ? (
            <Text variant="bodySmall" color="destructive">
              {disabledReason}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="outline" onPress={onCancel} style={styles.flex} />
            <Button
              label={loading ? t('common.pleaseWait') : confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={() => onConfirm(comments.trim())}
              loading={loading}
              disabled={disabled}
              style={styles.flex}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    padding: spacing.xl,
    gap: spacing.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
})
