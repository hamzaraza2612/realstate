import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { extractErrorMessage } from '@/api/apiClient'
import { BottomSheet, Button, Icon, Input, Select, Text, useToast } from '@/components'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { radius, spacing, useTheme } from '@/theme'
import { DocumentCategory, DocumentCategoryLabel } from '@/types/modules'
import { pickDocument, pickImage, type PickedFile } from '@/utils/filePicking'
import { useUploadDocument } from './api'

function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  return (dot > 0 ? name.slice(0, dot) : name).slice(0, 200)
}

/**
 * Bottom sheet that attaches a file to a record: take a photo with the camera, pick one from the
 * gallery, or pick any file (`utils/filePicking.ts`), then a real multipart `POST /documents`.
 * Success is only shown after the server returns the created document; a rejection (unsupported
 * type, too large, over quota, …) shows the server's own message. Disabled while offline — no
 * upload is ever queued.
 */
export function UploadDocumentSheet({
  visible,
  entityType,
  entityId,
  defaultCategory = DocumentCategory.General,
  onClose,
}: {
  visible: boolean
  entityType: string
  entityId: string
  defaultCategory?: DocumentCategory
  onClose: () => void
}) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const { colors } = useTheme()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const upload = useUploadDocument()

  const [file, setFile] = useState<PickedFile | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!visible) {
      setFile(null)
      setTitle('')
      setDescription('')
      setCategory(defaultCategory)
    }
  }, [visible, defaultCategory])

  async function choose(source: 'camera' | 'library' | 'file') {
    setPicking(true)
    try {
      const picked = source === 'file' ? await pickDocument() : await pickImage(source)
      if (picked) {
        setFile(picked)
        if (!title) setTitle(titleFromFileName(picked.name))
      }
    } catch {
      toast({ title: t('documents.pickError'), variant: 'error' })
    } finally {
      setPicking(false)
    }
  }

  async function submit() {
    if (!file || !title.trim()) return
    try {
      await upload.mutateAsync({ entityType, entityId, category, title: title.trim(), description: description.trim(), file })
      toast({ title: t('documents.uploaded'), variant: 'success' })
      onClose()
    } catch (error) {
      toast({ title: t('documents.uploadError'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    }
  }

  const categoryOptions = (Object.keys(DocumentCategoryLabel) as unknown as string[]).map((key) => ({
    value: key,
    label: enumLabel(DocumentCategoryLabel, Number(key) as DocumentCategory),
  }))

  return (
    <BottomSheet visible={visible} title={t('documents.uploadTitle')} onClose={onClose}>
            <View style={styles.sources}>
              <Button label={t('documents.takePhoto')} icon="camera-outline" variant="outline" size="sm" onPress={() => choose('camera')} disabled={picking} style={styles.source} />
              <Button label={t('documents.choosePhoto')} icon="images-outline" variant="outline" size="sm" onPress={() => choose('library')} disabled={picking} style={styles.source} />
              <Button label={t('documents.chooseFile')} icon="document-attach-outline" variant="outline" size="sm" onPress={() => choose('file')} disabled={picking} style={styles.source} />
            </View>

            {file ? (
              <View style={[styles.fileBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Icon name={file.mimeType.startsWith('image/') ? 'image-outline' : 'document-outline'} size={20} color={colors.foreground} />
                <View style={styles.flex}>
                  <Text variant="bodySmall" numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text variant="caption" color="mutedForeground">
                    {file.mimeType}
                  </Text>
                </View>
              </View>
            ) : (
              <Text variant="bodySmall" color="mutedForeground">
                {t('documents.noFileChosen')}
              </Text>
            )}

            <Input label={t('documents.titleLabel')} value={title} onChangeText={setTitle} maxLength={200} />
            <Select label={t('documents.category')} value={String(category)} options={categoryOptions} onChange={(value) => setCategory(Number(value) as DocumentCategory)} />
            <Input label={t('documents.descriptionLabel')} value={description} onChangeText={setDescription} multiline numberOfLines={2} />

            {isOffline ? (
              <Text variant="bodySmall" color="destructive">
                {t('offline.actionDisabled')}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Button label={t('common.cancel')} variant="outline" onPress={onClose} style={styles.flex} />
              <Button
                label={t('documents.upload')}
                icon="cloud-upload-outline"
                onPress={submit}
                loading={upload.isPending}
                disabled={!file || !title.trim() || isOffline}
                style={styles.flex}
              />
            </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  source: { flexGrow: 1 },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
})
