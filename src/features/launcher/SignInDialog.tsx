import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, UserRound } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NumPad } from '@/components/common/NumPad'
import type { Branch, Staff } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { errorText } from '@/lib/errors'
import { dataSource } from '@/services'
import { useApp } from '@/store/appStore'
import { isAdminRole, useSession } from '@/store/sessionStore'
import { cn } from '@/lib/utils'

/** `target`: a branch → POS sign-in; 'admin' → admin panel sign-in (manager/owner). */
export function SignInDialog({ target, onClose }: { target: Branch | 'admin' | null; onClose(): void }) {
  const { t, l } = useI18n()
  const directory = useApp((s) => s.directory)
  const startSession = useSession((s) => s.startSession)
  const navigate = useNavigate()
  const [member, setMember] = useState<Staff | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMember(null)
    setPin('')
    setError(null)
  }, [target])

  const admin = target === 'admin'
  const branch = admin ? null : target
  const people = directory.filter((s) =>
    s.active && (admin ? isAdminRole(s.role) : s.branchId === branch?.id || s.role === 'owner'),
  )

  const submit = async (code: string) => {
    if (!member) return
    setBusy(true)
    try {
      // API mode: verified by the server (hashed PINs, lockout). Demo: checked locally.
      const session = await dataSource.auth.login(member.id, code, branch?.id ?? null)
      startSession(session)
      navigate(admin ? '/admin' : '/pos')
    } catch (e) {
      setError(errorText(e, t) || t('launcher.wrongPin'))
      setTimeout(() => setPin(''), 350)
    } finally {
      setBusy(false)
    }
  }

  const digit = (d: string) => {
    if (!member || busy || pin.length >= 4) return
    const next = pin + d
    setError(null)
    setPin(next)
    if (next.length === 4) void submit(next)
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{admin ? t('launcher.admin') : branch ? l(branch.name) : ''}</DialogTitle>
          <DialogDescription>
            {member ? t('launcher.enterPin') : admin ? t('launcher.selectManager') : t('launcher.selectCashier')}
          </DialogDescription>
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
                setError(null)
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
                <span className="text-destructive">{error}</span>
              ) : member.pin ? (
                <span className="text-muted-foreground">
                  {t('launcher.demoPin')}: <b className="tabular text-foreground">{member.pin}</b>
                </span>
              ) : null}
            </p>
            <NumPad onDigit={digit} onBackspace={() => setPin((p) => p.slice(0, -1))} onClear={() => setPin('')} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
