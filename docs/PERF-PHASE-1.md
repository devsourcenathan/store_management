# Perf Phase 1 — mis en place (branche `perf/phase-1`)

## Backend
- `main.ts` : `helmet()` + `compression()` (réponses gzip).
- `app.module.ts` : `ThrottlerModule` global 100 req/min, `I18n watch` désactivé en prod.
- `instrument.ts` : Sentry `tracesSampleRate` 1.0 en dev, 0.1 en prod.
- Pagination bornée (enveloppe `{ data, meta }` seulement si `?page`/`?limit`, sinon tableau legacy capé) :
  - `GET /sales` (cap 200, selects allégés)
  - `GET /products` (cap 500 + `page/limit` du DTO enfin utilisés, selects allégés, join media via Map)
  - `GET /stock/movements` (cap 200)
  - `MediaService.findAll` (cap 200)
- `AnalyticsService.getDashboardStats` : cache mémoire 30s (`_cached: true` quand servi du cache).
- Logs `console.log` supprimés de `stock.service.ts`.

## Frontend
- `router.tsx` : toutes les pages en `React.lazy` sauf Login + shell Dashboard.
- `main.tsx` : Sentry tracing 0.1 / replay 0.01 en prod.
- `vite.config.ts` : `workbox.sourcemap: false`.
- `DashboardPage` : `staleTime 60s` + `refetchOnWindowFocus: false` sur les 3 queries analytics.
- `App.tsx` : `console.log` supprimé.

## Neon — à faire côté console (non versionnable)
1. `DATABASE_URL` → endpoint **pooler** + `&connection_limit=5`.
2. `DIRECT_URL` → endpoint **direct** (migrations).
3. Activer `pg_stat_statements` et relever le top 5 :
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 5;
```

## Vérification
- Backend : `npm run build` dans `backend/`.
- Frontend : `npx tsc --noEmit` + `npm run build` dans `frontend/`.
- Mesurer avant/après : p95 `GET /api/analytics/dashboard`, `GET /api/sales`, `GET /api/products?search=`.
