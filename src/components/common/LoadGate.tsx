import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/useI18n'

/** Spinner / error-with-retry while session data loads; renders children when ready. */
export function LoadGate({
  status,
  error,
  onRetry,
  children,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  onRetry(): void
  children: ReactNode
}) {
  const { t } = useI18n()
  if (status === 'ready') return <>{children}</>
  if (status === 'error') {
    return (
      <div className="grid h-full min-h-60 place-items-center p-6 text-center">
        <div>
          <p className="text-destructive">{error || t('err.generic')}</p>
          <Button className="mt-4" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="grid h-full min-h-60 place-items-center text-muted-foreground">
      <Loader2 className="size-8 animate-spin" />
    </div>
  )
}
