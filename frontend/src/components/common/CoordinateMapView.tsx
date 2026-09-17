/**
 * Lightweight lat/lng scatter plot — a practical first map view without pulling in a full GIS
 * library. Plots points proportionally within their own bounding box; not a georeferenced map.
 */
export interface MapPoint {
  id: string
  label: string
  sublabel?: string
  latitude: number
  longitude: number
  colorClassName: string
}

export function CoordinateMapView({ points, onSelect }: { points: MapPoint[]; onSelect?: (id: string) => void }) {
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No items with map coordinates yet.
      </div>
    )
  }

  const lats = points.map((p) => p.latitude)
  const lngs = points.map((p) => p.longitude)
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-md border bg-muted/30">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border)_1px,transparent_1px)] bg-[size:10%_10%] opacity-40" />
      {points.map((point) => {
        const left = ((point.longitude - minLng) / lngSpan) * 92 + 4
        const top = 96 - (((point.latitude - minLat) / latSpan) * 92 + 4)
        return (
          <button
            key={point.id}
            type="button"
            title={`${point.label}${point.sublabel ? ` · ${point.sublabel}` : ''}`}
            className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow transition-transform hover:scale-125 ${point.colorClassName}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            onClick={() => onSelect?.(point.id)}
          />
        )
      })}
    </div>
  )
}
