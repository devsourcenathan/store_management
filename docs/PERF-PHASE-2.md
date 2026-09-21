# Perf Phase 2 — mis en place (branche `perf/phase-2`, basée sur `perf/phase-1`)

## Base de données (`@@index` dans `schema.prisma`)
Note : `backend/prisma/migrations/` est gitignoré, donc `migrate deploy`
est un no-op en prod — c'est `prisma db push` (dans la commande de démarrage
du container, cf. `docker-compose.prod.yml`) qui synchronise le schéma,
index compris. Idempotent et sûr pour ces ajouts.
Nouveaux index composites (noms convention Prisma) :
- `products(organizationId, isActive, name)` + `products(categoryId)` — listings + recherche
- `sales(storeId, status, createdAt)` — dashboard / trend / reports
- `sale_items(saleId)` + `sale_items(productId)` — jointures top-products
- `payments(saleId)` — agrégation ventes espèces
- `stock_movements(storeId, type, createdAt)` + `(storeId, createdAt)` — scans magasin
- `misc_transactions(storeId, type, date)` — agrégats dashboard

Déploiement : `npx prisma migrate deploy` (appliqué auto au démarrage du container).
Vérifier sur Neon : `SELECT indexname FROM pg_indexes WHERE tablename IN ('sales','products','stock_movements');`

## Backend
- `stock-calculation.service.ts` : `calculateCurrentStock` + `calculateAllStockInStore`
  en SQL (`SUM` + `CASE`, `GROUP BY productId`) au lieu de charger tout l'historique.
  Direction ADJUST lue via LIKE sur notes (sans risque d'erreur JSON).
  `validateMovement` et alertes en profitent automatiquement.
- `analytics.service.ts getSalesTrend` : `DATE_TRUNC('day') + SUM` en SQL.
  Note : bornes de jour en timezone DB (UTC sur Neon) vs locale serveur avant.
- `media.controller.ts` : upload capé à 10MB.
- `media.service.ts` : downscale sharp max 1600px (format préservé) avant S3.
- Reports : inchangés (logique métier), accélérés par les nouveaux index.

## Frontend
- `DashboardPage` : `SalesChart` (recharts) en `React.lazy` + skeleton.
  recharts ne fait plus partie du bundle initial.
- `vite.config.ts` : `manualChunks` vendor-react / vendor-query / vendor-ui
  pour un cache long-terme sur Vercel.

## Vérification
- Backend : `npm run build` OK.
- Frontend : `npm run build` OK (chunks route + vendor séparés).
- Mesurer : p95 dashboard / sales / products + LCP Vercel.
