import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { useToasts } from '@/store/toastStore'
import { cn } from '@/lib/utils'

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'warning' ? TriangleAlert : Info
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cn(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-xl bg-ink px-4 py-3 text-left text-sm font-medium text-white shadow-lg',
            )}
          >
            <Icon className={cn('size-5 shrink-0', t.tone === 'success' ? 'text-[oklch(0.8_0.15_150)]' : t.tone === 'warning' ? 'text-mustard' : 'text-white/70')} />
            {t.text}
          </button>
        )
      })}
    </div>
  )
}
