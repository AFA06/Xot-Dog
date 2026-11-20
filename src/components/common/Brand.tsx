import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9 shrink-0', className)} aria-hidden>
      <rect width="40" height="40" rx="10" fill="var(--primary)" />
      <rect x="6" y="15" width="28" height="12" rx="6" fill="oklch(0.78 0.12 70)" />
      <rect x="9" y="17" width="22" height="8" rx="4" fill="oklch(0.42 0.13 30)" />
      <path d="M11 21 q2.2 -3 4.4 0 t4.4 0 t4.4 0 t4.4 0" fill="none" stroke="var(--mustard)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function DemoBadge({ className, label = 'DEMO' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-warning/50 bg-warning/15 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-[oklch(0.45_0.1_70)]',
        className,
      )}
    >
      {label}
    </span>
  )
}
