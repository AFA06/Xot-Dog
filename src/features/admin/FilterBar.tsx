import { CalendarDays } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n, type TranslationKey } from '@/i18n/useI18n'
import type { RangePreset } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { shortBranchName } from '@/lib/branch'
import { useApp } from '@/store/appStore'
import { useAdminFilters } from './adminFilters'

const PRESETS: { value: RangePreset; key: TranslationKey }[] = [
  { value: 'today', key: 'admin.today' },
  { value: 'yesterday', key: 'admin.yesterday' },
  { value: 'last7', key: 'admin.last7' },
  { value: 'last30', key: 'admin.last30' },
  { value: 'thisMonth', key: 'admin.thisMonth' },
  { value: 'custom', key: 'admin.custom' },
]

/** One row of filters above all charts/tables: branch + period. */
export function FilterBar() {
  const { t, locale } = useI18n()
  const branches = useApp((s) => s.branches)
  const { branch, preset, customFrom, customTo, setBranch, setPreset, setCustom } = useAdminFilters()

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-6">
      <div className="flex w-full overflow-x-auto rounded-lg bg-muted p-1 sm:w-auto">
        {[{ id: 'all', label: t('admin.allBranches'), short: t('admin.all') }, ...branches.map((b) => ({ id: b.id, label: shortBranchName(b, locale) }))].map(
          (o, i) => (
            <button
              key={o.id}
              onClick={() => setBranch(o.id)}
              aria-pressed={branch === o.id}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap sm:flex-none sm:px-3',
                branch === o.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {i > 0 && <span className="size-2 rounded-full" style={{ background: `var(--series-${i})` }} />}
              {'short' in o ? (
                <>
                  <span className="sm:hidden">{o.short}</span>
                  <span className="hidden sm:inline">{o.label}</span>
                </>
              ) : (
                o.label
              )}
            </button>
          ),
        )}
      </div>

      <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
        <SelectTrigger className="h-9 min-w-40 bg-card">
          <CalendarDays className="size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {t(p.key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => e.target.value && setCustom(e.target.value, customTo)}
            className="h-9 rounded-lg border bg-card px-2"
            aria-label={t('admin.from')}
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => e.target.value && setCustom(customFrom, e.target.value)}
            className="h-9 rounded-lg border bg-card px-2"
            aria-label={t('admin.to')}
          />
        </div>
      )}
    </div>
  )
}
