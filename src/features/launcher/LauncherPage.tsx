import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, MapPin, MonitorSmartphone, RotateCcw, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark, DemoBadge } from '@/components/common/Brand'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import { IntegrationStatus } from '@/components/common/IntegrationStatus'
import type { Branch } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { dataSource } from '@/services'
import { useApp } from '@/store/appStore'
import { currentToken, isAdminRole, useSession } from '@/store/sessionStore'
import { toast } from '@/store/toastStore'
import { SignInDialog } from './SignInDialog'

export function LauncherPage() {
  const { t, l } = useI18n()
  const branches = useApp((s) => s.branches)
  const resetDemo = useApp((s) => s.resetDemo)
  const navigate = useNavigate()
  const role = useSession((s) => s.role)
  const expired = useSession((s) => s.expired)
  const clearExpired = useSession((s) => s.clearExpired)
  const [target, setTarget] = useState<Branch | 'admin' | null>(null)

  useEffect(() => {
    if (expired) {
      toast(t('launcher.sessionExpired'), 'warning')
      clearExpired()
    }
  }, [expired, clearExpired, t])

  const openAdmin = () => {
    if (!dataSource.requiresAuth || (currentToken() && isAdminRole(role))) navigate('/admin')
    else setTarget('admin')
  }

  return (
    <div className="min-h-full bg-background">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="leading-tight">
            <div className="font-bold tracking-tight">{t('app.name')}</div>
            <div className="text-xs text-white/60">{t('app.phase')}</div>
          </div>
          <DemoBadge className="ml-1" label={t('app.demoBadge')} />
          <LanguageToggle dark className="ml-auto" />
        </div>
        <div className="border-t border-white/10 bg-warning/15">
          <p className="mx-auto max-w-5xl px-4 py-2 text-xs text-mustard sm:px-6">{t('app.demoBanner')}</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('launcher.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('launcher.subtitle')}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <section className="rounded-2xl border bg-card p-5 md:col-span-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <MonitorSmartphone className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('launcher.cashier')}</h2>
                <p className="text-sm text-muted-foreground">{t('launcher.cashierHint')}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {branches.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setTarget(b)}
                  className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-background p-4 text-left hover:border-primary"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: `var(--series-${i + 1})` }} />
                    <span className="font-semibold">{l(b.name)}</span>
                    <ArrowRight className="ml-auto size-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {l(b.address)}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col rounded-2xl border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-ink text-white">
                <BarChart3 className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('launcher.admin')}</h2>
                <p className="text-sm text-muted-foreground">{t('launcher.adminHint')}</p>
              </div>
            </div>
            <Button size="lg" className="mt-5 h-12 w-full text-base md:mt-auto" onClick={openAdmin}>
              <Store /> {t('launcher.open')}
            </Button>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold">{t('admin.integrations')}</h3>
          <IntegrationStatus className="mt-3" />
        </section>

        {dataSource.kind === 'demo' && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={async () => {
              await resetDemo()
              toast(t('launcher.resetDone'), 'success')
            }}
          >
            <RotateCcw /> {t('launcher.resetDemo')}
          </Button>
        </div>
        )}
      </main>

      <SignInDialog target={target} onClose={() => setTarget(null)} />
    </div>
  )
}
