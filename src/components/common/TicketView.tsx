import type { TicketDocument } from '@/services/printing'
import { cn } from '@/lib/utils'

/** Renders a TicketDocument as an 80 mm thermal-paper preview. */
export function TicketView({ ticket, className }: { ticket: TicketDocument; className?: string }) {
  return (
    <div
      className={cn(
        'ticket-paper mx-auto w-full max-w-[320px] bg-white px-5 py-6 text-[12.5px] leading-snug text-neutral-900 shadow-[0_1px_0_#0001,0_8px_24px_-8px_#0003]',
        className,
      )}
      style={{
        maskImage:
          'radial-gradient(circle at 6px 0, transparent 5px, #000 5.5px) top / 12px 51% repeat-x, radial-gradient(circle at 6px 100%, transparent 5px, #000 5.5px) bottom / 12px 51% repeat-x',
      }}
    >
      {ticket.rows.map((r, i) => {
        switch (r.kind) {
          case 'center':
            return (
              <div key={i} className={cn('text-center', r.bold && 'font-bold', r.size === 'large' && 'text-[15px]')}>
                {r.text}
              </div>
            )
          case 'pair':
            return (
              <div key={i} className={cn('flex justify-between gap-3', r.bold && 'text-[14px] font-bold')}>
                <span>{r.left}</span>
                <span className="text-right tabular">{r.right}</span>
              </div>
            )
          case 'item':
            return (
              <div key={i} className="py-0.5">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{r.name}</span>
                  <span className="tabular">{r.total}</span>
                </div>
                <div className="text-neutral-500 tabular">
                  {r.qty} × {r.unit}
                </div>
                {r.mods.map((m, j) => (
                  <div key={j} className="pl-3 text-neutral-600">
                    + {m}
                  </div>
                ))}
              </div>
            )
          case 'divider':
            return <div key={i} className="my-2 border-t border-dashed border-neutral-400" />
          case 'notice':
            return (
              <div key={i} className="my-1 border border-neutral-900 px-2 py-1 text-center text-[11px] font-bold uppercase">
                {r.text}
              </div>
            )
        }
      })}
    </div>
  )
}
