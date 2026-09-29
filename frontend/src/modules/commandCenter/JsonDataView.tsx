/** Renders an arbitrary, tool-sourced JSON value (an AI message's `facts`, or an action proposal's
 * `parameters`/`result`) as a compact structured block — object/array in, key-value rows or a mini
 * table out. Deliberately generic: this data has no fixed DTO shape (it's whatever the invoked AI
 * tool returned), so the renderer never assumes particular keys, only humanizes whatever it finds.
 * This is the visual "Sources" counterpart to an assistant message's prose — see
 * docs/AI_ARCHITECTURE.md's hallucination-defense section for why the two must stay visually
 * separate rather than being concatenated into the narrative. */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  if (!spaced) return key
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function renderCell(value: unknown, depth: number) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  if (isPlainObject(value) || Array.isArray(value)) {
    if (depth >= 2) return <span className="text-muted-foreground">{JSON.stringify(value)}</span>
    return <JsonDataView data={value} depth={depth} />
  }
  return <>{formatPrimitive(value)}</>
}

export function JsonDataView({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) return <span className="text-muted-foreground">—</span>

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">No data.</span>

    const allPrimitive = data.every((item) => !isPlainObject(item) && !Array.isArray(item))
    if (allPrimitive) {
      return <span>{data.map((item) => formatPrimitive(item)).join(', ')}</span>
    }

    const keys = Array.from(new Set(data.flatMap((item) => (isPlainObject(item) ? Object.keys(item) : ['value']))))
    const visible = data.slice(0, 10)
    return (
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {keys.map((key) => (
                <th key={key} className="whitespace-nowrap px-2 py-1 text-start font-medium text-muted-foreground">
                  {humanizeKey(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item, index) => (
              <tr key={index} className="border-t">
                {keys.map((key) => (
                  <td key={key} className="whitespace-nowrap px-2 py-1">
                    {isPlainObject(item) ? renderCell(item[key], depth + 1) : renderCell(item, depth + 1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > visible.length && (
          <p className="border-t px-2 py-1 text-xs text-muted-foreground">+{data.length - visible.length} more</p>
        )}
      </div>
    )
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data)
    if (entries.length === 0) return <span className="text-muted-foreground">No data.</span>
    return (
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-3 border-b border-dashed py-0.5 last:border-0">
            <dt className="shrink-0 text-xs text-muted-foreground">{humanizeKey(key)}</dt>
            <dd className="text-end text-xs font-medium">{renderCell(value, depth + 1)}</dd>
          </div>
        ))}
      </dl>
    )
  }

  return <span>{formatPrimitive(data)}</span>
}
