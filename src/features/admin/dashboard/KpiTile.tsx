import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

export function KpiTile({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string
  value: string
  change: number | null
  icon: LucideIcon
}) {
  const { t } = useI18n()
  const up = change !== null && change > 0.0005
  const down = change !== null && change < -0.0005
  const Arrow = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight tabular sm:mt-2 sm:text-[26px] 2xl:text-[28px]">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs">
        {change === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular',
                up && 'bg-success/12 text-[oklch(0.42_0.12_150)]',
                down && 'bg-destructive/10 text-destructive',
                !up && !down && 'bg-muted text-muted-foreground',
              )}
            >
              <Arrow className="size-3.5" />
              {(Math.abs(change) * 100).toFixed(1).replace('.', ',')}%
            </span>
            <span className="text-muted-foreground">{t('admin.vsPrev')}</span>
          </>
        )}
      </div>
    </div>
  )
}
