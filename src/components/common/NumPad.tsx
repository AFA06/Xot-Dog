import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumPadProps {
  onDigit(d: string): void
  onBackspace(): void
  onClear?: () => void
  extraKey?: { label: string; onPress(): void }
  className?: string
  size?: 'md' | 'lg'
}

/** Large touch keypad shared by PIN entry and cash tendering. */
export function NumPad({ onDigit, onBackspace, onClear, extraKey, className, size = 'lg' }: NumPadProps) {
  const key = cn(
    'rounded-xl border bg-card font-semibold tabular active:bg-muted select-none',
    size === 'lg' ? 'h-16 text-2xl' : 'h-13 text-xl',
  )
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" className={key} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      {extraKey ? (
        <button type="button" className={cn(key, 'text-base')} onClick={extraKey.onPress}>
          {extraKey.label}
        </button>
      ) : onClear ? (
        <button type="button" className={cn(key, 'text-base text-muted-foreground')} onClick={onClear}>
          C
        </button>
      ) : (
        <span />
      )}
      <button type="button" className={key} onClick={() => onDigit('0')}>
        0
      </button>
      <button type="button" className={cn(key, 'grid place-items-center')} onClick={onBackspace} aria-label="Backspace">
        <Delete className="size-6" />
      </button>
    </div>
  )
}
