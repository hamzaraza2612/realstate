import * as React from 'react'
import { cn } from '@/lib/utils'

/** A pulsing placeholder block for content that is still loading — size it with `className`
 * (e.g. `h-4 w-32`) to match the shape of what will replace it. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}
