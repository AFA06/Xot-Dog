# API data source (future phase — not implemented)

Phase 1 runs entirely on `createDemoDataSource()`. When the FastAPI + PostgreSQL
backend is approved, add `createApiDataSource(baseUrl)` here implementing the
`DataSource` interface from `../types.ts`:

| Interface method              | Suggested endpoint                         |
|-------------------------------|--------------------------------------------|
| `branches.list()`             | `GET  /api/v1/branches`                    |
| `catalog.get()`               | `GET  /api/v1/catalog?branch_id=`          |
| `catalog.saveProduct(p)`      | `PUT  /api/v1/products/{id}`               |
| `staff.list()` / `save()`     | `GET/PUT /api/v1/staff`                    |
| `orders.list(q)`              | `GET  /api/v1/orders?branch_id=&from=&to=` |
| `orders.create(input)`        | `POST /api/v1/orders` (idempotency key!)   |
| `orders.registerReprint(id)`  | `POST /api/v1/orders/{id}/reprints`        |

Notes for that phase:
- Totals must be recomputed server-side; the client total is only a hint.
- Offline-first PWA: queue `orders.create` in IndexedDB and sync with an idempotency key.
- Fiscalization (OFD) happens server-side or via the fiscal module, and updates `order.fiscal`.
- Printing goes through a local printer agent consuming `TicketDocument` (see `../printing`).
- Reporting endpoints can return the same shapes as `src/lib/reports.ts`.
