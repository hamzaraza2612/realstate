import { Download, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/portalApiClient'
import { formatDate } from '@/lib/utils'
import { DocumentCategoryLabel } from '@/types/api'
import type { PortalCommonApi } from './portalCommon'

/** Shared across all five portal areas — see `createPortalCommonApi`. */
export function PortalDocumentsPage({ useDocuments, downloadDocument }: Pick<PortalCommonApi, 'useDocuments' | 'downloadDocument'>) {
  const { data, isLoading, isError, refetch } = useDocuments()

  async function handleDownload(id: string, title: string) {
    try {
      await downloadDocument(id, undefined, title)
    } catch (error) {
      toast({ title: 'Could not download document', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader title="Documents" description="Files shared with you — contracts, receipts, statements and more." />

      {isLoading && <LoadingState label="Loading documents…" />}
      {isError && <ErrorState message="Could not load documents." onRetry={() => refetch()} />}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState title="No documents yet" description="Documents shared with you will appear here." />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Added</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {doc.title}
                  </div>
                  {doc.description && <p className="mt-0.5 text-xs text-muted-foreground">{doc.description}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{DocumentCategoryLabel[doc.category]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">v{doc.latestVersionNumber}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(doc.createdAt)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(doc.id, doc.title)}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
