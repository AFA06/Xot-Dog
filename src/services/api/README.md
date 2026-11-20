# API data source (Phase 2)

`createApiDataSource(baseUrl)` implements the `DataSource` interface from `../types.ts`
against the FastAPI backend in `/backend`. Enabled with `VITE_DATA_SOURCE=api`.

| Interface method               | Endpoint                                        | Who                  |
|--------------------------------|-------------------------------------------------|----------------------|
| `auth.directory()`             | `GET  /api/v1/auth/directory`                   | public               |
| `auth.login(id, pin, branch)`  | `POST /api/v1/auth/login` → JWT                 | public (lockout)     |
| `branches.list()`              | `GET  /api/v1/branches`                         | public               |
| —                              | `POST/PUT /api/v1/branches[/{id}]`              | owner                |
| `catalog.get()`                | `GET  /api/v1/catalog`                          | signed in            |
| `catalog.saveProduct(p)`       | `PUT  /api/v1/products/{id}`                    | manager*, owner      |
| `staff.list()` / `save()`      | `GET/PUT /api/v1/staff[/{id}]`                  | manager*, owner      |
| `orders.list(q)`               | `GET  /api/v1/orders?branchId=&from=&to=`       | branch-scoped        |
| `orders.create(input)`         | `POST /api/v1/orders` + `Idempotency-Key`       | branch-scoped        |
| `orders.registerReprint(id)`   | `POST /api/v1/orders/{id}/reprints`             | branch-scoped        |
| —                              | `POST /api/v1/orders/{id}/void`                 | manager*, owner      |
| `analytics.dashboard(q)`       | `GET  /api/v1/analytics/dashboard`              | manager*, owner      |

\* managers are limited to their own branch (cashiers only, own-branch availability).

- The server recomputes prices, modifiers, totals and change. The client sends only
  product/modifier ids and quantities, plus `expectedTotal` to detect a stale catalog (409 `price_changed`).
- The `Idempotency-Key` is stable per checkout, and network failures are retried with the same key,
  so an order is never duplicated.
- Errors are `{"detail": {"code", "message"}}`, and `src/lib/errors.ts` maps codes to uz/ru text.
- Payment (`recorded_demo`), fiscal (`not_integrated`) and printing remain **simulated**.
