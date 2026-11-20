import { CreditCard, Database, Printer, ReceiptText } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { dataSource } from '@/services'

/** Honest status of every integration. Phase 2: only the backend is real; payment, printer and fiscal are not connected. */
export function IntegrationStatus({ className }: { className?: string }) {
  const { t } = useI18n()
  const items = [
    { icon: CreditCard, label: t('admin.int.payment'), value: t('admin.int.notConnected'), ok: false },
    { icon: Printer, label: t('admin.int.printer'), value: t('admin.int.notConnected'), ok: false },
    { icon: ReceiptText, label: t('admin.int.fiscal'), value: t('admin.int.notConnected'), ok: false },
    {
      icon: Database,
      label: t('admin.int.backend'),
      value: dataSource.kind === 'api' ? t('admin.int.connected') : t('admin.int.demoLocal'),
      ok: dataSource.kind === 'api',
    },
  ]
  return (
    <ul className={cn('grid gap-2 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map(({ icon: Icon, label, value, ok }) => (
        <li key={label} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
          <Icon className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{label}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-1.5 shrink-0 rounded-full', ok ? 'bg-success' : 'bg-muted-foreground/50')} />
              {value}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
