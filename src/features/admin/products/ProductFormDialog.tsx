import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Branch, Category, ModifierGroup, Product, ProductTone } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { shortBranchName } from '@/lib/branch'
import { cn } from '@/lib/utils'
import { TONE_BAR } from '@/features/cashier/tones'

const TONES: ProductTone[] = ['red', 'mustard', 'brown', 'green', 'blue', 'purple']

function blank(branches: Branch[]): Product {
  return {
    id: `p-${Date.now().toString(36)}`,
    sku: '',
    categoryId: 'hotdogs',
    name: { uz: '', ru: '' },
    price: 0,
    modifierGroupIds: [],
    active: true,
    branchIds: branches.map((b) => b.id),
    tone: 'red',
  }
}

export function ProductFormDialog({
  product,
  categories,
  groups,
  branches,
  onClose,
  onSave,
}: {
  product: Product | 'new' | null
  categories: Category[]
  groups: ModifierGroup[]
  branches: Branch[]
  onClose(): void
  onSave(p: Product): Promise<void>
}) {
  const { t, l, locale } = useI18n()
  const [draft, setDraft] = useState<Product | null>(null)

  useEffect(() => {
    setDraft(product === 'new' ? blank(branches) : product)
  }, [product, branches])

  if (!draft) return null
  const valid = draft.name.uz.trim() && draft.name.ru.trim() && draft.price > 0 && draft.branchIds.length > 0
  const set = (patch: Partial<Product>) => setDraft({ ...draft, ...patch })
  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product === 'new' ? t('admin.addProduct') : t('admin.editProduct')}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) void onSave({ ...draft, sku: draft.sku || draft.id.toUpperCase().replace(/-/g, '') })
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name-uz">{t('admin.nameUz')}</Label>
              <Input id="name-uz" value={draft.name.uz} onChange={(e) => set({ name: { ...draft.name, uz: e.target.value } })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name-ru">{t('admin.nameRu')}</Label>
              <Input id="name-ru" value={draft.name.ru} onChange={(e) => set({ name: { ...draft.name, ru: e.target.value } })} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t('admin.category')}</Label>
              <Select value={draft.categoryId} onValueChange={(v) => set({ categoryId: v as Product['categoryId'] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {l(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="price">
                {t('admin.price')} ({locale === 'uz' ? "so'm" : 'сум'})
              </Label>
              <Input
                id="price"
                inputMode="numeric"
                value={draft.price || ''}
                onChange={(e) => set({ price: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                className="tabular"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{t('admin.modifiers')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => {
                const on = draft.modifierGroupIds.includes(g.id)
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => set({ modifierGroupIds: toggle(draft.modifierGroupIds, g.id) })}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-sm', on ? 'border-primary bg-primary/10 font-medium text-primary' : 'text-muted-foreground')}
                  >
                    {l(g.name)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>{t('admin.branches')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => {
                const on = draft.branchIds.includes(b.id)
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => set({ branchIds: toggle(draft.branchIds, b.id) })}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-sm', on ? 'border-ink bg-ink text-white' : 'text-muted-foreground')}
                  >
                    {shortBranchName(b, locale)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1.5">
              {TONES.map((tone) => (
                <button
                  type="button"
                  key={tone}
                  aria-label={tone}
                  onClick={() => set({ tone })}
                  className={cn('size-7 rounded-full ring-offset-2', TONE_BAR[tone], draft.tone === tone && 'ring-2 ring-ink')}
                />
              ))}
            </div>
            <label className="ml-auto flex items-center gap-2 text-sm">
              <Switch checked={draft.active} onCheckedChange={(active) => set({ active })} />
              {draft.active ? t('admin.active') : t('admin.inactive')}
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('admin.cancel')}
            </Button>
            <Button type="submit" disabled={!valid}>
              {t('admin.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
