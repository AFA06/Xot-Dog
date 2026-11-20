import type { Locale } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

const LABELS: Record<Locale, string> = { uz: "O'zb", ru: 'Рус' }

export function LanguageToggle({ className, dark }: { className?: string; dark?: boolean }) {
  const { locale, setLocale } = useI18n()
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={cn('inline-flex rounded-lg p-1', dark ? 'bg-white/10' : 'bg-muted', className)}
    >
      {(['uz', 'ru'] as Locale[]).map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={locale === l}
          onClick={() => setLocale(l)}
          className={cn(
            'min-w-12 rounded-md px-3 py-1.5 text-sm font-semibold',
            locale === l
              ? dark
                ? 'bg-white text-ink'
                : 'bg-card text-foreground shadow-sm'
              : dark
                ? 'text-white/70 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
