import { useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

/** Card shell with an accessible chart ⇄ table toggle. */
export function ChartCard({
  title,
  subtitle,
  legend,
  chart,
  table,
  className,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  legend?: ReactNode
  chart: ReactNode
  table?: ReactNode
  className?: string
  actions?: ReactNode
}) {
  const { t } = useI18n()
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <section className={cn('rounded-2xl border bg-card p-4 sm:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {table && (
            <div className="flex rounded-lg bg-muted p-0.5">
              {(['chart', 'table'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  title={v === 'chart' ? t('admin.chartView') : t('admin.tableView')}
                  className={cn('grid size-7 place-items-center rounded-md', view === v ? 'bg-card shadow-sm' : 'text-muted-foreground')}
                >
                  {v === 'chart' ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {view === 'chart' && legend}
      {view === 'chart' ? chart : <div className="max-h-80 overflow-auto">{table}</div>}
    </section>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function ChartTooltip({
  active,
  title,
  rows,
}: {
  active?: boolean
  title: string
  rows: { label: string; value: string; color?: string }[]
}) {
  if (!active) return null
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {r.color && <span className="size-2 rounded-[2px]" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium tabular">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-card text-left text-muted-foreground">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={cn('py-1.5 font-medium', i > 0 && 'text-right')}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y tabular">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={cn('py-1.5', j > 0 && 'text-right')}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
