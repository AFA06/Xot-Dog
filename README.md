# Xot-Dog POS: Phase 2 (FastAPI + PostgreSQL)

A fast-food POS demo for a fictional two-branch restaurant in Tashkent (Chilonzor and Yunusobod).
It includes a cashier screen for a 15" Windows touch POS and an admin panel that works on the owner's phone.

> ⚠️ **DEMO ONLY.** All menu items, prices, staff, addresses and sales are **fictional**.
> **No payment, printer, cash drawer or fiscal (OFD) integration exists.** The app records which
> payment method was chosen. Tickets are marked "FISKAL CHEK EMAS / НЕ ФИСКАЛЬНЫЙ ЧЕК", and printing
> is only simulated.

## Run

### Full stack (Docker)

```bash
docker compose up -d --build   # db (5433), api (8010), web (8080)
open http://127.0.0.1:8080      # app served by nginx, /api proxied to FastAPI
open http://127.0.0.1:8010/docs # OpenAPI docs
```

On first start the API runs `alembic upgrade head` and seeds the **fictional** demo data
(branches, menu, staff and 60 days of orders). Seeding runs only when the database is empty.
Data lives in the `pgdata` volume and survives `docker compose restart` / `down` / `up`.
(`docker compose down -v` deletes it.)

### Frontend dev server against the API

```bash
docker compose up -d db api
npm install
npm run dev        # http://127.0.0.1:5173/ (proxies /api → 127.0.0.1:8010)
npm run dev:demo   # Phase 1 in-browser demo, no backend
```

### Tests

```bash
npm test           # vitest: unit, cashier UI flow (demo source), API adapter
npm run build      # typecheck + production build
docker compose exec api python -m pytest -q   # backend tests (xotdog_test database)
# or locally: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest -q
```

Demo PINs are shown on the sign-in screen (`DEMO_PIN_HINTS=true`, local dev only). Examples:
Aziz `1111` (Chilonzor cashier), Malika `3333` (Yunusobod cashier), Kamola `9999` (Chilonzor manager), owner `0000`.
In API mode the admin panel needs a manager or owner sign-in. Five wrong PINs lock the account for five minutes.

## Structure

```
src/
  domain/types.ts          Backend-agnostic domain model (integer UZS)
  data/demo/               ⚠️ Fictional catalog, staff, seeded 60-day order generator
  lib/                     Pure logic: cart, money, dates, reports (unit-tested)
  services/
    types.ts               DataSource / repository interfaces (the only thing the UI uses)
    demo/                  Phase 1 implementation (in-browser + localStorage)
    api/                   Phase 2 HTTP implementation + endpoint mapping (README.md)
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

backend/
  app/models.py            SQLAlchemy models (integer UZS, JSONB uz/ru text)
  app/routers/             auth, branches, catalog, staff, orders, analytics
  app/services/orders.py   server-side pricing, modifier validation, idempotency, ticket numbers
  app/services/analytics.py SQL reports (same shapes as src/lib/reports.ts)
  app/seed/                fictional demo fixture + history generator
  alembic/                 migrations
  tests/                   pytest against PostgreSQL
docker-compose.yml         db + api + web
```

## Still simulated / next phases

- **Payment:** the app records only the method chosen (`recorded_demo`). No terminal, Payme or Click integration.
- **Fiscal (OFD):** every order is `not_integrated`. Tickets say "FISKAL CHEK EMAS".
- **Printing:** simulated. A future local agent will consume `TicketDocument` JSON.
- **Offline PWA:** not yet. Orders already carry an idempotency key, which an IndexedDB queue can reuse.
- **Branch management UI:** branches can be created and edited through the API (owner), but there is no admin screen yet.
