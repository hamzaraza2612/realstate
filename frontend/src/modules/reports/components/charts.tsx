import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Shared chart styling — reads the app's own CSS custom properties (see `src/index.css`) so
// charts track the dark-mode toggle automatically instead of hardcoding hex colors.
const axisStyle = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
const gridStroke = 'hsl(var(--border))'
const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
}

export interface ChartSeries<T> {
  key: keyof T & string
  label: string
  color: string
}

// Recharts' v3 generics (`TypedDataKey<T, any>`) want the exact row type it infers from the
// `data` array it's handed, which fights a reusable wrapper component's own generic `T`. The
// values that cross that boundary (dataKey strings, tooltip formatters) are cast at the prop
// site below — the component's own public props stay fully typed against the caller's row type.

/** A time/period trend — one or a few named series against a shared x-axis (e.g. sales,
 * collections or revenue/expenses by month). */
export function TrendLineChart<T extends object>({
  data,
  xKey,
  series,
  height = 260,
  valueFormatter,
}: {
  data: T[]
  xKey: keyof T & string
  series: ChartSeries<T>[]
  height?: number
  valueFormatter?: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey as string} tick={axisStyle} axisLine={{ stroke: gridStroke }} tickLine={false} />
        <YAxis
          tick={axisStyle}
          axisLine={{ stroke: gridStroke }}
          tickLine={false}
          width={64}
          tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : String(v))}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={((value: number, name: string) => [valueFormatter ? valueFormatter(value) : value, name]) as never}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key as string}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** A single-series breakdown by category (e.g. booking count per status). Each bar is its
 * own category on the x-axis rather than a stacked/legend series, so one hue is enough —
 * no categorical palette is needed. */
export function CategoryBarChart<T extends object>({
  data,
  xKey,
  yKey,
  color = 'hsl(var(--primary))',
  height = 260,
  valueFormatter,
}: {
  data: T[]
  xKey: keyof T & string
  yKey: keyof T & string
  color?: string
  height?: number
  valueFormatter?: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey as string} tick={axisStyle} axisLine={{ stroke: gridStroke }} tickLine={false} />
        <YAxis
          tick={axisStyle}
          axisLine={{ stroke: gridStroke }}
          tickLine={false}
          width={64}
          tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : String(v))}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={((value: number) => [valueFormatter ? valueFormatter(value) : String(value), '']) as never}
        />
        <Bar dataKey={yKey as string} fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
