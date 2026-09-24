import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { NotificationCategoryLabel, type NotificationPreferenceDto } from '@/types/api'
import { useNotificationPreferences, useUpdateNotificationPreference } from './api'

export function NotificationPreferencesPage() {
  const navigate = useNavigate()
  const { data: preferences, isLoading, isError, refetch } = useNotificationPreferences()
  const updatePreference = useUpdateNotificationPreference()

  async function handleToggle(preference: NotificationPreferenceDto, field: 'inAppEnabled' | 'emailEnabled', value: boolean) {
    try {
      await updatePreference.mutateAsync({ ...preference, [field]: value })
    } catch (error) {
      toast({ title: 'Could not save preference', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Notification preferences"
        description="Choose how you want to be notified for each type of event."
        actions={
          <Button variant="outline" onClick={() => navigate('/notifications')}>
            Back to notifications
          </Button>
        }
      />

      {isLoading && <LoadingState label="Loading preferences…" />}
      {isError && <ErrorState message="Could not load notification preferences." onRetry={() => refetch()} />}

      {!isLoading && !isError && preferences && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>In-app</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preferences.map((preference) => (
              <TableRow key={preference.category}>
                <TableCell className="font-medium">{NotificationCategoryLabel[preference.category]}</TableCell>
                <TableCell>
                  <Checkbox
                    checked={preference.inAppEnabled}
                    onCheckedChange={(checked) => handleToggle(preference, 'inAppEnabled', checked === true)}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={preference.emailEnabled}
                    onCheckedChange={(checked) => handleToggle(preference, 'emailEnabled', checked === true)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
