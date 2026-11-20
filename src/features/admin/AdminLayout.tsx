import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MonitorSmartphone, Package, ReceiptText, Users } from 'lucide-react'
import { BrandMark, DemoBadge } from '@/components/common/Brand'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import { useI18n, type TranslationKey } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { FilterBar } from './FilterBar'

const NAV: { to: string; key: TranslationKey; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { to: '/admin', key: 'admin.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', key: 'admin.orders', icon: ReceiptText },
  { to: '/admin/products', key: 'admin.products', icon: Package },
  { to: '/admin/staff', key: 'admin.staff', icon: Users },
]

export function AdminLayout() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const showFilters = pathname === '/admin' || pathname.startsWith('/admin/orders') || pathname.startsWith('/admin/staff')

  return (
    <div className="flex min-h-full bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandMark />
          <div className="leading-tight">
            <div className="font-bold">{t('app.name')}</div>
            <div className="text-xs text-white/50">{t('admin.title')}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-sidebar-accent text-white' : 'text-white/65 hover:bg-sidebar-accent/60 hover:text-white',
                )
              }
            >
              <Icon className="size-[18px]" /> {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 p-4">
          <div className="rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-white/60">
            <DemoBadge label={t('app.demoBadge')} className="mb-1.5 border-mustard/40 bg-mustard/15 text-mustard" />
            <p>{t('app.demoBanner')}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            <MonitorSmartphone className="size-4" /> {t('admin.toPos')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <BrandMark className="size-8 lg:hidden" />
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">{current ? t(current.key) : t('admin.title')}</h1>
            <DemoBadge label={t('app.demoBadge')} className="lg:hidden" />
            <div className="ml-auto flex items-center gap-2">
              <LanguageToggle />
            </div>
          </div>
          {showFilters && <FilterBar />}
        </header>

        <main className="flex-1 px-4 pt-4 pb-24 sm:px-6 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')
            }
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate px-1">{t(key)}</span>
          </NavLink>
        ))}
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground">
          <MonitorSmartphone className="size-5" />
          <span>{t('admin.toPos')}</span>
        </button>
      </nav>
    </div>
  )
}
