import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { radius, spacing, useTheme } from '@/theme'
import { Icon } from './Icon'
import { Text } from './Text'

/** Lightweight toast (the web `use-toast` counterpart) for mutation feedback: "Request approved",
 * "Could not record your decision — <server reason>". One at a time, auto-dismissed. */

type ToastVariant = 'success' | 'error'
interface ToastMessage {
  title: string
  description?: string
  variant: ToastVariant
}

const ToastContext = createContext<((message: ToastMessage) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const show = useCallback((next: ToastMessage) => {
    if (timer.current) clearTimeout(timer.current)
    setMessage(next)
    timer.current = setTimeout(() => setMessage(null), 3500)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const tone = message?.variant === 'error' ? colors.tones.danger : colors.tones.success

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 72 }]}>
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[styles.toast, { backgroundColor: colors.card, borderColor: tone.border }]}
          >
            <Icon name={message.variant === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color={tone.dot} />
            <View style={styles.text}>
              <Text variant="subheading">{message.title}</Text>
              {message.description ? (
                <Text variant="bodySmall" color="mutedForeground">
                  {message.description}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: { flex: 1, gap: 2 },
})
