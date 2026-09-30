import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { ProjectNodeDto } from '@/types/api'
import { ProjectNodeTypeLabel } from '@/types/api'
import { useDeleteProjectNode } from './api'

function buildTree(nodes: ProjectNodeDto[], parentId: string | null): ProjectNodeDto[] {
  return nodes
    .filter((n) => n.parentNodeId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

function NodeRow({ node, nodes, depth }: { node: ProjectNodeDto; nodes: ProjectNodeDto[]; depth: number }) {
  const deleteNode = useDeleteProjectNode()
  const children = buildTree(nodes, node.id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    try {
      await deleteNode.mutateAsync(node.id)
      toast({ title: 'Node deleted', variant: 'success' })
      setConfirmOpen(false)
    } catch (error) {
      toast({ title: 'Could not delete node', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent" style={{ marginLeft: depth * 20 }}>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{ProjectNodeTypeLabel[node.nodeType]}</Badge>
          <span className="font-medium">{node.name}</span>
          <span className="text-sm text-muted-foreground">{node.code}</span>
          {node.inventoryCount > 0 && <span className="text-xs text-muted-foreground">· {node.inventoryCount} units</span>}
        </div>
        <PermissionGate permission="projects.manage">
          <Button
            variant="ghost"
            size="sm"
            disabled={deleteNode.isPending || node.childNodeCount > 0 || node.inventoryCount > 0}
            title={node.childNodeCount > 0 || node.inventoryCount > 0 ? 'Remove child nodes and inventory first' : 'Delete node'}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </PermissionGate>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete hierarchy node"
        description={`Delete ${ProjectNodeTypeLabel[node.nodeType].toLowerCase()} "${node.name}" (${node.code}) from this project's hierarchy? This cannot be undone.`}
        confirmLabel="Delete node"
        destructive
        loading={deleteNode.isPending}
        onConfirm={handleDelete}
      />
      {children.map((child) => (
        <NodeRow key={child.id} node={child} nodes={nodes} depth={depth + 1} />
      ))}
    </div>
  )
}

export function HierarchyTree({ nodes }: { nodes: ProjectNodeDto[] }) {
  const roots = buildTree(nodes, null)

  if (roots.length === 0) {
    return <p className="text-sm text-muted-foreground">No hierarchy defined yet. Add a phase, block, building or floor to get started.</p>
  }

  return (
    <div className="flex flex-col gap-0.5">
      {roots.map((node) => (
        <NodeRow key={node.id} node={node} nodes={nodes} depth={0} />
      ))}
    </div>
  )
}
