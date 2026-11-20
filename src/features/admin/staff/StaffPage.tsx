import { useEffect, useMemo, useState } from 'react'
import { Pencil, Phone, Plus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Staff, StaffRole } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { branchColor, shortBranchName } from '@/lib/branch'
import { groupDigits } from '@/lib/money'
import { staffStats } from '@/lib/reports'
import { cn } from '@/lib/utils'
import { errorText } from '@/lib/errors'
import { dataSource } from '@/services'
import { useApp } from '@/store/appStore'
import { toast } from '@/store/toastStore'
import { useAdminFilters, useFilteredOrders } from '../adminFilters'

const ROLES: StaffRole[] = ['cashier', 'manager', 'owner']

export function StaffPage() {
  const { t, money, locale } = useI18n()
  const staff = useApp((s) => s.staff)
  const branches = useApp((s) => s.branches)
  const saveStaff = useApp((s) => s.saveStaff)
  const branchFilter = useAdminFilters((s) => s.branch)
  const { orders } = useFilteredOrders()
  const stats = useMemo(() => staffStats(orders), [orders])
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)

  const list = staff
    .filter((s) => branchFilter === 'all' || s.branchId === branchFilter || s.branchId === null)
    .sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || (a.branchId ?? '').localeCompare(b.branchId ?? ''))

  return (
    <div className="space-y-3">
      <div className="flex">
        <Button className="ml-auto h-9" onClick={() => setEditing('new')}>
          <Plus /> {t('admin.addStaff')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => {
          const st = stats.get(s.id)
          const branch = branches.find((b) => b.id === s.branchId)
          return (
            <div key={s.id} className={cn('rounded-2xl border bg-card p-4', !s.active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-muted">
                  <UserRound className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {t(`admin.role.${s.role}`)} ·
                    {branch ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-full" style={{ background: branchColor(branches, branch.id) }} />
                        {shortBranchName(branch, locale)}
                      </span>
                    ) : (
                      t('admin.allBranches')
                    )}
                  </div>
                </div>
                <Switch
                  checked={s.active}
                  aria-label={t('admin.active')}
                  onCheckedChange={async (active) => {
                    try {
                      await saveStaff({ ...s, active })
                      toast(t('admin.saved'), 'success')
                    } catch (e) {
                      toast(errorText(e, t), 'warning')
                    }
                  }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin.ordersCount')}</div>
                  <div className="font-semibold tabular">{groupDigits(st?.orders ?? 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('admin.revenue')}</div>
                  <div className="font-semibold tabular">{money(st?.revenue ?? 0)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm text-muted-foreground">
                <Phone className="mr-1.5 size-3.5" /> <span className="tabular">{s.phone}</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(s)}>
                  <Pencil /> {t('admin.edit')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      <StaffDialog
        member={editing}
        onClose={() => setEditing(null)}
        onSave={async (m) => {
          try {
            await saveStaff(m)
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

function StaffDialog({ member, onClose, onSave }: { member: Staff | 'new' | null; onClose(): void; onSave(s: Staff): Promise<void> }) {
  const { t, locale } = useI18n()
  const branches = useApp((s) => s.branches)
  const [d, setD] = useState<Staff | null>(null)

  useEffect(() => {
    setD(
      member === 'new'
        ? { id: `st-${Date.now().toString(36)}`, name: '', role: 'cashier', branchId: branches[0]?.id ?? null, pin: '', active: true, phone: '+998 ' }
        : member,
    )
  }, [member, branches])

  if (!d) return null
  // API never returns PINs: for existing staff an empty field keeps the current PIN.
  const keepPin = member !== 'new' && d.pin === ''
  const valid = d.name.trim().length > 1 && (/^\d{4}$/.test(d.pin) || keepPin)
  const set = (p: Partial<Staff>) => setD({ ...d, ...p })

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member === 'new' ? t('admin.addStaff') : t('admin.editStaff')}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) void onSave({ ...d, branchId: d.role === 'owner' ? null : d.branchId })
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="st-name">{t('admin.name')}</Label>
            <Input id="st-name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t('admin.role')}</Label>
              <Select value={d.role} onValueChange={(v) => set({ role: v as StaffRole })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`admin.role.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t('admin.branch')}</Label>
              <Select
                value={d.role === 'owner' ? 'all' : (d.branchId ?? branches[0]?.id)}
                disabled={d.role === 'owner'}
                onValueChange={(v) => set({ branchId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {d.role === 'owner' && <SelectItem value="all">{t('admin.allBranches')}</SelectItem>}
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {shortBranchName(b, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="st-phone">{t('admin.phone')}</Label>
              <Input id="st-phone" value={d.phone} onChange={(e) => set({ phone: e.target.value })} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-pin">{t('admin.pin')}</Label>
              <Input
                id="st-pin"
                inputMode="numeric"
                maxLength={4}
                value={d.pin}
                onChange={(e) => set({ pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className="tabular"
                placeholder={member !== 'new' && dataSource.requiresAuth ? '••••' : undefined}
              />
              {member !== 'new' && dataSource.requiresAuth && (
                <p className="text-xs text-muted-foreground">{t('admin.pinKeep')}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
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
