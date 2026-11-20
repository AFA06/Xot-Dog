import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, UserRound } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NumPad } from '@/components/common/NumPad'
import type { Branch, Staff } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { useApp } from '@/store/appStore'
import { useSession } from '@/store/sessionStore'
import { cn } from '@/lib/utils'

export function SignInDialog({ branch, onClose }: { branch: Branch | null; onClose(): void }) {
  const { t, l } = useI18n()
  const staff = useApp((s) => s.staff)
  const signIn = useSession((s) => s.signIn)
  const navigate = useNavigate()
  const [member, setMember] = useState<Staff | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    setMember(null)
    setPin('')
    setError(false)
  }, [branch])

  const people = staff.filter((s) => s.active && (s.branchId === branch?.id || s.role === 'owner'))

  const digit = (d: string) => {
    if (!member || pin.length >= 4) return
    const next = pin + d
    setError(false)
    setPin(next)
    if (next.length === 4) {
      if (next === member.pin && branch) {
        signIn(branch.id, member.id)
        navigate('/pos')
      } else {
        setError(true)
        setTimeout(() => setPin(''), 350)
      }
    }
  }

  return (
    <Dialog open={!!branch} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{branch ? l(branch.name) : ''}</DialogTitle>
          <DialogDescription>{member ? t('launcher.enterPin') : t('launcher.selectCashier')}</DialogDescription>
        </DialogHeader>

        {!member ? (
          <div className="grid grid-cols-2 gap-2">
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setMember(p)}
                className="flex items-center gap-3 rounded-xl border-2 p-3 text-left hover:border-primary"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                  <UserRound className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{t(`admin.role.${p.role}`)}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setMember(null)
                setPin('')
              }}
              className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> {member.name}
            </button>
            <div className={cn('mb-2 flex justify-center gap-3', error && 'text-destructive')}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'size-4 rounded-full border-2',
                    i < pin.length ? (error ? 'border-destructive bg-destructive' : 'border-foreground bg-foreground') : 'border-border',
                  )}
                />
              ))}
            </div>
            <p className="mb-4 h-5 text-center text-sm">
              {error ? (
                <span className="text-destructive">{t('launcher.wrongPin')}</span>
              ) : (
                <span className="text-muted-foreground">
                  {t('launcher.demoPin')}: <b className="tabular text-foreground">{member.pin}</b>
                </span>
              )}
            </p>
            <NumPad onDigit={digit} onBackspace={() => setPin((p) => p.slice(0, -1))} onClear={() => setPin('')} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
