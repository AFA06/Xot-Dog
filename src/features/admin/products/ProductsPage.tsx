import { useMemo, useState } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { CategoryId, Product } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { branchColor, shortBranchName } from '@/lib/branch'
import { groupDigits } from '@/lib/money'
import { cn } from '@/lib/utils'
import { errorText } from '@/lib/errors'
import { useApp } from '@/store/appStore'
import { toast } from '@/store/toastStore'
import { TONE_BAR } from '@/features/cashier/tones'
import { ProductFormDialog } from './ProductFormDialog'

export function ProductsPage() {
  const { t, l, locale } = useI18n()
  const { categories, products, modifierGroups } = useApp((s) => s.catalog)
  const branches = useApp((s) => s.branches)
  const saveProduct = useApp((s) => s.saveProduct)
  const [cat, setCat] = useState<'all' | CategoryId>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return products.filter(
      (p) =>
        (cat === 'all' || p.categoryId === cat) &&
        (!needle || p.name.uz.toLowerCase().includes(needle) || p.name.ru.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)),
    )
  }, [products, cat, q])

  const sortedCats = [...categories].sort((a, b) => a.sort - b.sort)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('admin.searchProduct')}
            className="h-9 w-full rounded-lg border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto">
          {[{ id: 'all' as const, label: t('admin.allCategories') }, ...sortedCats.map((c) => ({ id: c.id, label: l(c.name) }))].map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                'h-9 rounded-lg px-3 text-sm font-medium whitespace-nowrap',
                cat === c.id ? 'bg-ink text-white' : 'bg-card text-muted-foreground hover:text-foreground border',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Button className="ml-auto h-9" onClick={() => setEditing('new')}>
          <Plus /> {t('admin.addProduct')}
        </Button>
      </div>

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {list.map((p) => (
          <li key={p.id} className={cn('flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4', !p.active && 'bg-muted/40')}>
            <span className={cn('h-10 w-1.5 shrink-0 rounded-full', TONE_BAR[p.tone])} />
            <div className="min-w-0 flex-1">
              <div className={cn('truncate font-medium', !p.active && 'text-muted-foreground')}>{l(p.name)}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>{l(categories.find((c) => c.id === p.categoryId)?.name)}</span>
                <span className="hidden sm:inline">· {p.sku}</span>
                {p.modifierGroupIds.length > 0 && (
                  <span className="hidden sm:inline">
                    · {t('admin.modifiers')}: {p.modifierGroupIds.length}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  ·
                  {branches.map((b) => (
                    <span
                      key={b.id}
                      title={shortBranchName(b, locale)}
                      className={cn('size-2 rounded-full', !p.branchIds.includes(b.id) && 'opacity-20')}
                      style={{ background: branchColor(branches, b.id) }}
                    />
                  ))}
                </span>
              </div>
            </div>
            <div className="text-right font-semibold tabular">{groupDigits(p.price)}</div>
            <Switch
              checked={p.active}
              aria-label={t('admin.active')}
              onCheckedChange={async (active) => {
                try {
                  await saveProduct({ ...p, active })
                  toast(`${l(p.name)}: ${active ? t('admin.active') : t('admin.inactive')}`, 'success')
                } catch (e) {
                  toast(errorText(e, t), 'warning')
                }
              }}
            />
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setEditing(p)} aria-label={t('admin.edit')}>
              <Pencil />
            </Button>
          </li>
        ))}
        {list.length === 0 && <li className="p-8 text-center text-muted-foreground">{t('admin.noData')}</li>}
      </ul>

      <ProductFormDialog
        product={editing}
        categories={sortedCats}
        groups={modifierGroups}
        branches={branches}
        onClose={() => setEditing(null)}
        onSave={async (p) => {
          try {
            await saveProduct(p)
            toast(t('admin.saved'), 'success')
            setEditing(null)
          } catch (e) {
            toast(errorText(e, t), 'warning')
          }
        }}
      />
    </div>
  )
}
