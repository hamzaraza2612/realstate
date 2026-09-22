import { useRef, useState } from 'react'
import { Download, History, Plus, Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { DocumentCategory, DocumentCategoryLabel, type DocumentDto } from '@/types/api'
import { downloadDocument, useAddDocumentVersion, useDeleteDocument, useDocument, useDocuments, useUploadDocument } from './api'

const ACCEPTED_FILE_TYPES =
  '.pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx,.pptx,.zip,application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip'

const MAX_SIZE_BYTES = 25 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentsPanelProps {
  entityType: string
  entityId: string
  title?: string
}

export function DocumentsPanel({ entityType, entityId, title = 'Documents' }: DocumentsPanelProps) {
  const { data: documents, isLoading, isError, refetch } = useDocuments(entityType, entityId)
  const deleteDocument = useDeleteDocument()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [versionsTarget, setVersionsTarget] = useState<DocumentDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentDto | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDocument.mutateAsync(deleteTarget.id)
      toast({ title: 'Document deleted', variant: 'success' })
      setDeleteTarget(null)
    } catch (error) {
      toast({ title: 'Could not delete document', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleDownloadLatest(doc: DocumentDto) {
    try {
      await downloadDocument(doc.id)
    } catch (error) {
      toast({ title: 'Could not download document', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <PermissionGate permission="documents.manage">
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload
          </Button>
        </PermissionGate>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading documents…" />}
        {isError && <ErrorState message="Could not load documents." onRetry={() => refetch()} />}
        {!isLoading && !isError && (documents?.length ?? 0) === 0 && (
          <EmptyState title="No documents yet" description="Uploaded files for this record will show up here." />
        )}
        {!isLoading && !isError && documents && documents.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {doc.title}
                    {doc.description && <p className="mt-0.5 text-xs font-normal text-muted-foreground">{doc.description}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{DocumentCategoryLabel[doc.category]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">v{doc.latestVersionNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.createdByUserName ?? '—'}
                    <div className="text-xs">{formatDate(doc.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Download latest version" onClick={() => handleDownloadLatest(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Version history" onClick={() => setVersionsTarget(doc)}>
                        <History className="h-4 w-4" />
                      </Button>
                      <PermissionGate permission="documents.manage">
                        <Button variant="ghost" size="icon" title="Delete document" onClick={() => setDeleteTarget(doc)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} entityType={entityType} entityId={entityId} />

      <VersionsDialog document={versionsTarget} onOpenChange={(open) => !open && setVersionsTarget(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete document"
        description={`This permanently deletes "${deleteTarget?.title}" and all of its versions. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteDocument.isPending}
        onConfirm={handleDelete}
      />
    </Card>
  )
}

function UploadDocumentDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: string
  entityId: string
}) {
  const uploadDocument = useUploadDocument()
  const [category, setCategory] = useState<string>(String(DocumentCategory.General))
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setCategory(String(DocumentCategory.General))
    setTitle('')
    setDescription('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast({ title: 'Choose a file to upload', variant: 'destructive' })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: 'File is too large', description: 'Maximum file size is 25 MB.', variant: 'destructive' })
      return
    }
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    try {
      await uploadDocument.mutateAsync({
        entityType,
        entityId,
        category: Number(category) as DocumentCategory,
        title: title.trim(),
        description,
        file,
      })
      toast({ title: 'Document uploaded', variant: 'success' })
      reset()
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not upload document', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Attach a file to this record. Allowed: pdf, png, jpeg, webp, txt, csv, docx, xlsx, pptx, zip (max 25MB).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="doc-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DocumentCategoryLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-description">Description (optional)</Label>
            <Textarea id="doc-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input id="doc-file" ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploadDocument.isPending}>
            {uploadDocument.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VersionsDialog({ document, onOpenChange }: { document: DocumentDto | null; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading, isError, refetch } = useDocument(document?.id)
  const addVersion = useAddDocumentVersion()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDownload(versionNumber: number, fileName: string) {
    if (!document) return
    try {
      await downloadDocument(document.id, versionNumber, fileName)
    } catch (error) {
      toast({ title: 'Could not download version', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleUploadNewVersion() {
    const file = fileInputRef.current?.files?.[0]
    if (!document || !file) {
      toast({ title: 'Choose a file to upload', variant: 'destructive' })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: 'File is too large', description: 'Maximum file size is 25 MB.', variant: 'destructive' })
      return
    }
    try {
      await addVersion.mutateAsync({ id: document.id, file })
      toast({ title: 'New version uploaded', variant: 'success' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      refetch()
    } catch (error) {
      toast({ title: 'Could not upload new version', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version history — {document?.title}</DialogTitle>
          <DialogDescription>All uploaded versions of this document, newest first.</DialogDescription>
        </DialogHeader>

        {isLoading && <LoadingState label="Loading versions…" />}
        {isError && <ErrorState message="Could not load version history." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>v{version.versionNumber}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-medium" title={version.originalFileName}>
                    {version.originalFileName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatBytes(version.sizeBytes)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {version.uploadedByUserName ?? '—'}
                    <div className="text-xs">{formatDate(version.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Download this version"
                      onClick={() => handleDownload(version.versionNumber, version.originalFileName)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <PermissionGate permission="documents.manage">
          <div className="flex items-center gap-2 border-t pt-4">
            <Input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} className="flex-1" />
            <Button variant="outline" onClick={handleUploadNewVersion} disabled={addVersion.isPending}>
              <Upload className="h-4 w-4" /> {addVersion.isPending ? 'Uploading…' : 'Upload new version'}
            </Button>
          </div>
        </PermissionGate>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
