import type { Category, Product } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { usePos } from './posStore'
import { CATEGORY_ICON } from './tones'

export function CategoryRail({ categories, products }: { categories: Category[]; products: Product[] }) {
  const { l } = useI18n()
  const active = usePos((s) => s.category)
  const setCategory = usePos((s) => s.setCategory)
  return (
    <nav className="flex w-[104px] shrink-0 flex-col gap-1.5 overflow-y-auto border-r bg-card p-2">
      {[...categories]
        .sort((a, b) => a.sort - b.sort)
        .map((c) => {
          const Icon = CATEGORY_ICON[c.id]
          const count = products.filter((p) => p.categoryId === c.id).length
          const isActive = c.id === active
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              aria-pressed={isActive}
              className={cn(
                'flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center text-[13px] font-semibold leading-tight',
                isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted active:bg-muted',
              )}
            >
              <Icon className="size-7" strokeWidth={1.8} />
              <span>{l(c.name)}</span>
              <span className={cn('text-[11px] font-medium', isActive ? 'text-white/75' : 'text-muted-foreground')}>{count}</span>
            </button>
          )
        })}
    </nav>
  )
}
