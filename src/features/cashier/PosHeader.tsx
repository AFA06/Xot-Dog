import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, LogOut, Maximize, Minimize, UserRound } from 'lucide-react'
import { BrandMark, DemoBadge } from '@/components/common/Brand'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import type { Branch, Staff } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { useSession } from '@/store/sessionStore'
import { usePos } from './posStore'
import { formatTicketDate } from '@/services/printing'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function PosHeader({ branch, cashier, onHistory }: { branch: Branch; cashier: Staff; onHistory(): void }) {
  const { t, l } = useI18n()
  const now = useClock()
  const navigate = useNavigate()
  const signOut = useSession((s) => s.signOut)
  const clear = usePos((s) => s.clear)
  const [fs, setFs] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const btn = 'flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white/90 hover:bg-white/10 active:bg-white/15'

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 bg-ink px-3 text-white">
      <BrandMark className="size-10" />
      <div className="mr-1 min-w-0 leading-tight">
        <div className="truncate text-[15px] font-bold">{l(branch.name)}</div>
        <div className="text-xs text-white/55 tabular">
          {formatTicketDate(now.toISOString())}
        </div>
      </div>
      <DemoBadge label={t('app.demoBadge')} className="border-mustard/40 bg-mustard/15 text-mustard" />

      <div className="ml-auto flex items-center gap-1">
        <button className={btn} onClick={onHistory}>
          <History className="size-5" />
          <span className="hidden lg:inline">{t('pos.history')}</span>
        </button>
        <LanguageToggle dark className="mx-1" />
        <button className={btn} onClick={toggleFs} aria-label={t('pos.fullscreen')} title={t('pos.fullscreen')}>
          {fs ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>
        <div className="mx-1 h-8 w-px bg-white/15" />
        <div className="flex items-center gap-2 px-2 text-sm">
          <UserRound className="size-5 text-white/60" />
          <span className="max-w-32 truncate font-medium">{cashier.name}</span>
        </div>
        <button
          className={btn}
          onClick={() => {
            clear()
            signOut()
            navigate('/')
          }}
          title={t('pos.exit')}
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </header>
  )
}
