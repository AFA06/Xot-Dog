# Xot-Dog POS: Phase 1 demo

A fast-food POS demo for a fictional two-branch restaurant in Tashkent (Chilonzor and Yunusobod).
It includes a cashier screen for a 15" Windows touch POS and an admin panel that works on the owner's phone.

> ⚠️ **DEMO ONLY.** All menu items, prices, staff, addresses and sales are **fictional**.
> **No payment, printer, cash drawer or fiscal (OFD) integration exists.** The app records which
> payment method was chosen. Tickets are marked "FISKAL CHEK EMAS / НЕ ФИСКАЛЬНЫЙ ЧЕК", and printing
> is only simulated.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173/
npm test           # vitest: unit tests + cashier UI flow
npm run build      # typecheck + production build
```

Demo PINs are shown on the sign-in screen. Examples: Aziz `1111` (Chilonzor) and Malika `3333` (Yunusobod).
To clear local changes, use **"Demo ma'lumotlarni tiklash"** on the start screen.

## Structure

```
src/
  domain/types.ts          Backend-agnostic domain model (integer UZS)
  data/demo/               ⚠️ Fictional catalog, staff, seeded 60-day order generator
  lib/                     Pure logic: cart, money, dates, reports (unit-tested)
  services/
    types.ts               DataSource / repository interfaces (the only thing the UI uses)
    demo/                  Phase 1 implementation (in-browser + localStorage)
    api/README.md          Planned FastAPI endpoint mapping (not implemented)
    payment/               PaymentAdapter: demo recorder only, never "approves"
    fiscal/                FiscalAdapter: always `not_integrated` in Phase 1
    printing/              TicketDocument builder + simulated printer (future local agent)
  i18n/                    Uzbek (Latin) + Russian dictionaries
  store/                   zustand stores (app data, session/locale, toasts)
  features/
    launcher/              Workstation picker + cashier PIN sign-in (demo)
    cashier/               POS screen: categories, grid, modifiers, cart, payment, ticket, history
    admin/                 Dashboard, orders, products, staff; branch + date filters
  components/ui/           shadcn/ui components
```

## Prepared for later phases (not started)

- **FastAPI + PostgreSQL:** add `createApiDataSource()` that implements `services/types.ts`. See `services/api/README.md`.
- **PWA / offline:** queue `orders.create` with an idempotency key.
- **Local printer agent:** pass `TicketDocument` JSON to a local ESC/POS service.
- **Fiscal module:** add a real `FiscalAdapter` that updates `order.fiscal`.
