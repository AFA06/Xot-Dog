import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, Clock, CreditCard, Package, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { IntegrationStatus } from '@/components/common/IntegrationStatus'
import { useI18n } from '@/i18n/useI18n'
import { branchColor, shortBranchName } from '@/lib/branch'
import { fromDateKey } from '@/lib/dates'
import { groupDigits } from '@/lib/money'
import { peakHour, percentChange, summarize } from '@/lib/reports'
import { cn } from '@/lib/utils'
import { LoadGate } from '@/components/common/LoadGate'
import { useApp } from '@/store/appStore'
import { useDashboard } from './useDashboard'
import { ChartCard, ChartTooltip, DataTable, Legend } from './ChartCard'
import { KpiTile } from './KpiTile'

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }
const NEUTRAL = 'var(--ink-2)'

function dayLabel(key: string) {
  const d = fromDateKey(key)
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`
}
const hourLabel = (h: number) => `${h.toString().padStart(2, '0')}:00`

export function DashboardPage() {
  const { t, l, money, compact, locale } = useI18n()
  const branches = useApp((s) => s.branches)
  const products = useApp((s) => s.catalog.products)
  const categories = useApp((s) => s.catalog.categories)
  const { data, error, loading, branchIds } = useDashboard()
  const [bestBy, setBestBy] = useState<'quantity' | 'revenue'>('quantity')

  const empty = useMemo(() => summarize([]), [])
  const sum = data?.summary ?? empty
  const prev = data?.previous ?? empty
  const daily = data?.daily ?? []
  const hourly = data?.hourly ?? []
  const peak = peakHour(hourly)
  const best = (bestBy === 'quantity' ? data?.bestsellersByQuantity : data?.bestsellersByRevenue) ?? []
  const cats: Record<string, number> = data?.categoryRevenue ?? {}
  const perBranch = useMemo(
    () => branches.map((b) => ({ branch: b, s: data?.perBranch.find((x) => x.branchId === b.id)?.summary ?? empty })),
    [branches, data, empty],
  )

  if (!data) {
    return <LoadGate status={error ? 'error' : 'loading'} error={error ?? undefined} onRetry={() => window.location.reload()}>
        {null}
      </LoadGate>
  }

  const shownBranches = branches.filter((b) => branchIds.includes(b.id))
  const multi = shownBranches.length > 1
  const singleDay = daily.length <= 1
  const productName = (id: string) => l(products.find((p) => p.id === id)?.name) || id
  const legendItems = shownBranches.map((b) => ({ label: shortBranchName(b, locale), color: branchColor(branches, b.id) }))

  if (sum.orders === 0 && sum.voided === 0 && !loading) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">{t('admin.noData')}</div>
    )
  }

  const maxBest = Math.max(1, ...best.map((b) => b[bestBy]))
  const catTotal = Object.values(cats).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile icon={Wallet} label={t('admin.revenue')} value={money(sum.revenue)} change={percentChange(sum.revenue, prev.revenue)} />
        <KpiTile icon={Receipt} label={t('admin.completedOrders')} value={groupDigits(sum.orders)} change={percentChange(sum.orders, prev.orders)} />
        <KpiTile icon={ShoppingBag} label={t('admin.avgTicket')} value={money(sum.avgTicket)} change={percentChange(sum.avgTicket, prev.avgTicket)} />
        <KpiTile icon={Package} label={t('admin.itemsSold')} value={groupDigits(sum.itemsSold)} change={percentChange(sum.itemsSold, prev.itemsSold)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Revenue over time */}
        <ChartCard
          className="xl:col-span-2"
          title={singleDay ? t('admin.revenueByHour') : t('admin.revenueByDay')}
          subtitle={money(sum.revenue)}
          legend={multi ? <Legend items={legendItems} /> : undefined}
          chart={
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(singleDay ? hourly.map((h) => ({ ...h, label: hourLabel(h.hour) })) : daily.map((d) => ({ ...d, label: dayLabel(d.date) }))) as Record<string, number | string>[]}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => compact(v)} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                    content={({ active, payload, label }) => {
                      const row = payload?.[0]?.payload as Record<string, number> | undefined
                      if (!row) return null
                      const rows = singleDay
                        ? [{ label: t('admin.revenue'), value: money(row.revenue) }, { label: t('admin.ordersCount'), value: String(row.orders) }]
                        : [
                            ...shownBranches.map((b) => ({ label: shortBranchName(b, locale), value: money(row[b.id] ?? 0), color: branchColor(branches, b.id) })),
                            ...(multi ? [{ label: t('admin.combined'), value: money(row.total) }] : []),
                          ]
                      return <ChartTooltip active={active} title={String(label)} rows={rows} />
                    }}
                  />
                  {singleDay ? (
                    <Bar dataKey="revenue" fill={multi ? NEUTRAL : branchColor(branches, shownBranches[0].id)} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  ) : (
                    shownBranches.map((b, i) => (
                      <Bar
                        key={b.id}
                        dataKey={b.id}
                        stackId="rev"
                        fill={branchColor(branches, b.id)}
                        stroke="var(--card)"
                        strokeWidth={multi ? 2 : 0}
                        radius={i === shownBranches.length - 1 ? [4, 4, 0, 0] : 0}
                        maxBarSize={36}
                      />
                    ))
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
          table={
            singleDay ? (
              <DataTable head={[t('admin.hour'), t('admin.ordersCount'), t('admin.revenue')]} rows={hourly.map((h) => [hourLabel(h.hour), h.orders, groupDigits(h.revenue)])} />
            ) : (
              <DataTable
                head={[t('admin.date'), ...shownBranches.map((b) => shortBranchName(b, locale)), ...(multi ? [t('admin.combined')] : [])]}
                rows={daily.map((d) => [dayLabel(d.date), ...shownBranches.map((b) => groupDigits(Number(d[b.id] ?? 0))), ...(multi ? [groupDigits(d.total)] : [])])}
              />
            )
          }
        />

        {/* Branch comparison / payment split */}
        <section className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="mb-3 font-semibold">{t('admin.branchComparison')}</h2>
            <ul className="space-y-3">
              {perBranch.map(({ branch, s }) => {
                const share = sum.revenue ? s.revenue / sum.revenue : 0
                const included = branchIds.includes(branch.id)
                return (
                  <li key={branch.id} className={cn(!included && 'opacity-40')}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-[3px]" style={{ background: branchColor(branches, branch.id) }} />
                      <span className="font-medium">{shortBranchName(branch, locale)}</span>
                      <span className="ml-auto font-semibold tabular">{money(s.revenue)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${included ? share * 100 : 0}%`, background: branchColor(branches, branch.id) }} />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular">
                      <span>
                        {s.orders} {t('admin.ordersCount').toLowerCase()} · {t('admin.avgTicket').toLowerCase()} {money(s.avgTicket)}
                      </span>
                      <span>{included ? `${Math.round(share * 100)}%` : ''}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 className="mb-3 font-semibold">{t('admin.paymentSplit')}</h2>
            {(() => {
              const cashShare = sum.revenue ? sum.cashRevenue / sum.revenue : 0
              return (
                <>
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                    <div className="h-full rounded-l-full bg-ink" style={{ width: `${cashShare * 100}%` }} />
                    <div className="h-full flex-1 rounded-r-full bg-[oklch(0.75_0.01_60)]" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-2.5 rounded-[3px] bg-ink" /> <Banknote className="size-4" /> {t('pos.cash')}
                      </div>
                      <div className="mt-0.5 font-semibold tabular">{money(sum.cashRevenue)}</div>
                      <div className="text-xs text-muted-foreground tabular">
                        {Math.round(cashShare * 100)}% · {sum.cashOrders}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-2.5 rounded-[3px] bg-[oklch(0.75_0.01_60)]" /> <CreditCard className="size-4" /> {t('pos.card')}
                      </div>
                      <div className="mt-0.5 font-semibold tabular">{money(sum.cardRevenue)}</div>
                      <div className="text-xs text-muted-foreground tabular">
                        {sum.revenue ? 100 - Math.round(cashShare * 100) : 0}% · {sum.cardOrders}
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Peak hours */}
        <ChartCard
          className="xl:col-span-2"
          title={t('admin.peakHours')}
          subtitle={
            peak && peak.orders > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {hourLabel(peak.hour)}–{hourLabel(peak.hour + 1)} · {peak.orders} {t('admin.ordersCount').toLowerCase()}
              </span>
            ) : (
              t('admin.ordersPerHour')
            )
          }
          legend={multi ? <Legend items={legendItems} /> : undefined}
          chart={
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly.map((h) => ({ ...h, label: hourLabel(h.hour) }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="14%">
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.6 }}
                    content={({ active, payload, label }) => {
                      const row = payload?.[0]?.payload as Record<string, number> | undefined
                      if (!row) return null
                      return (
                        <ChartTooltip
                          active={active}
                          title={String(label)}
                          rows={[
                            ...shownBranches.map((b) => ({ label: shortBranchName(b, locale), value: String(row[b.id] ?? 0), color: branchColor(branches, b.id) })),
                            ...(multi ? [{ label: t('admin.combined'), value: String(row.orders) }] : []),
                            { label: t('admin.revenue'), value: money(row.revenue) },
                          ]}
                        />
                      )
                    }}
                  />
                  {shownBranches.map((b, i) => (
                    <Bar
                      key={b.id}
                      dataKey={b.id}
                      stackId="h"
                      fill={branchColor(branches, b.id)}
                      stroke="var(--card)"
                      strokeWidth={multi ? 2 : 0}
                      radius={i === shownBranches.length - 1 ? [4, 4, 0, 0] : 0}
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
          table={
            <DataTable
              head={[t('admin.hour'), ...shownBranches.map((b) => shortBranchName(b, locale)), t('admin.revenue')]}
              rows={hourly.map((h) => [hourLabel(h.hour), ...shownBranches.map((b) => h[b.id] ?? 0), groupDigits(h.revenue)])}
            />
          }
        />

        {/* Category share */}
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">{t('admin.categorySales')}</h2>
          <ul className="space-y-3">
            {[...categories]
              .sort((a, b) => (cats[b.id] ?? 0) - (cats[a.id] ?? 0))
              .map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span>{l(c.name)}</span>
                    <span className="font-medium tabular">
                      {compact((cats[c.id] ?? 0))} <span className="text-muted-foreground">· {Math.round(((cats[c.id] ?? 0) / catTotal) * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${((cats[c.id] ?? 0) / catTotal) * 100}%`, background: NEUTRAL }} />
                  </div>
                </li>
              ))}
          </ul>
        </section>
      </div>

      {/* Bestsellers */}
      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{t('admin.bestsellers')}</h2>
          <div className="ml-auto flex rounded-lg bg-muted p-0.5 text-sm">
            {(['quantity', 'revenue'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setBestBy(k)}
                aria-pressed={bestBy === k}
                className={cn('rounded-md px-3 py-1 font-medium', bestBy === k ? 'bg-card shadow-sm' : 'text-muted-foreground')}
              >
                {k === 'quantity' ? t('admin.byQty') : t('admin.byRevenue')}
              </button>
            ))}
          </div>
        </div>
        <ol className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
          {best.map((b, i) => (
            <li key={b.productId} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm font-semibold text-muted-foreground tabular">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{productName(b.productId)}</span>
                  <span className="shrink-0 tabular">
                    <b>{groupDigits(b.quantity)}</b> <span className="text-muted-foreground">· {compact(b.revenue)}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/80" style={{ width: `${(b[bestBy] / maxBest) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">{t('admin.integrations')}</h2>
        <IntegrationStatus className="mt-3" />
        <p className="mt-3 text-xs text-muted-foreground">
          {t('admin.voidedNote')}: {sum.voided}
        </p>
      </section>
    </div>
  )
}
