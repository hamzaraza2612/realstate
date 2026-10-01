import { StyleSheet, View } from 'react-native'
import { Badge, Card, Text } from '@/components'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'
import type { PortalProfile } from '@/types/api'

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

/** Who is signed in to the portal: name, email, organization and account type — straight from the
 * portal session's `PortalProfile` (refreshed from `GET /portal/auth/me` on start). */
export function PortalIdentityCard({ profile, compact }: { profile: PortalProfile; compact?: boolean }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  return (
    <Card>
      <View style={styles.identity}>
        <View style={[styles.avatar, compact && styles.avatarCompact, { backgroundColor: colors.primary }]}>
          <Text variant={compact ? 'subheading' : 'heading'} color="primaryForeground">
            {initialsOf(profile.displayName)}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant={compact ? 'subheading' : 'heading'} numberOfLines={1}>
            {profile.displayName}
          </Text>
          <Text variant="bodySmall" color="mutedForeground" numberOfLines={1}>
            {profile.email}
          </Text>
        </View>
        <Badge label={t(`portal.actor.${profile.actorType}`)} tone="info" />
      </View>
      {compact ? null : (
        <>
          <Field label={t('profile.organization')} value={profile.tenantName} />
          <Field label={t('portal.home.accountType')} value={t(`portal.actor.${profile.actorType}`)} />
        </>
      )}
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarCompact: { width: 40, height: 40, borderRadius: 20 },
  field: { gap: spacing.xs },
})
