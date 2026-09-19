import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { ProjectStatus, ProjectStatusLabel, ProjectType, ProjectTypeLabel } from '@/types/api'
import { useProjects } from './api'
import { ProjectFormDialog } from './ProjectFormDialog'

const statusVariant: Record<ProjectStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ProjectStatus.Planning]: 'secondary',
  [ProjectStatus.Active]: 'success',
  [ProjectStatus.OnHold]: 'outline',
  [ProjectStatus.Completed]: 'default',
  [ProjectStatus.Cancelled]: 'destructive',
}

const ALL = 'all'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useProjects(page, {
    search: search || undefined,
    type: type === ALL ? undefined : (Number(type) as ProjectType),
    status: status === ALL ? undefined : (Number(status) as ProjectStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Societies, buildings and developments that hold your inventory."
        actions={
          <PermissionGate permission="projects.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or code…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.entries(ProjectTypeLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(ProjectStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading projects…" />}
      {isError && <ErrorState message="Could not load projects." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No projects found" description="Try different filters or create your first project." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Hierarchy</TableHead>
                <TableHead>Inventory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((project) => (
                <TableRow key={project.id} className="cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <TableCell className="font-medium">
                    {project.name}
                    <span className="ml-1.5 text-sm text-muted-foreground">· {project.code}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ProjectTypeLabel[project.type]}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[project.status]}>{ProjectStatusLabel[project.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{[project.city, project.country].filter(Boolean).join(', ') || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{project.nodeCount}</TableCell>
                  <TableCell className="text-muted-foreground">{project.inventoryCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} projects
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
