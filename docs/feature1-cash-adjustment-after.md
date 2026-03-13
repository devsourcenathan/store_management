# Feature 1 : Gestion des écarts de caisse (Surplus / Manquant) - Implémentation réalisée

## Modèles Prisma
- Modèle `CashAdjustment` créé avec les champs `id`, `storeId`, `date`, `expected`, `counted`, `difference`, `reason`, `createdBy`, `createdAt`, `updatedAt`.
- Le champ `difference` est calculé côté front ainsi que validé/recalculé côté backend pour des raisons de sécurité.

## Back-end (NestJS)
- **Module** : `CashAdjustmentsModule`
- **Contrôleur** : `CashAdjustmentsController`
  - `POST /cash-adjustments` : Création d'un écart de caisse. Protégé par `JwtAuthGuard`. Le calcul exact (`counted - expected`) est effectué côté serveur. Enregistrement d'un log d'audit.
  - `GET /cash-adjustments` : Liste avec filtres par `storeId`, `startDate`, `endDate`.
- **Service** : `CashAdjustmentsService` gère la logique de validation, la transaction avec AuditService, et les agrégations.
- **DTOs** : `CreateCashAdjustmentDto` avec validation pointue via `class-validator`.

## Front-end (React / Ant Design)
- Route `/cash-adjustments` ajoutée sous `DashboardLayout` dans `router.tsx`.
- Page `CashAdjustmentPage` créée avec :
  - Un formulaire permettant à l'utilisateur de renseigner l'attendu de caisse et le comptage physique.
  - Un affichage dynamique en temps réel de l'écart (Surplus ou Manquant).
  - Un tableau récapitulatif filtrable par magasin et par date.
  - Des statistiques globales (Total surplus, Total manquant, Solde net).

## Reports
- `ReportsService` mis à jour pour agréger les totaux `CashAdjustment` dans les rapports de caisse quotidiens et mensuels.

## Tests et Audit
- Tracabilité incluse avec `createdBy` (ID de l'utilisateur) dans la BDD et génération de logs d'audit.
- Tests unitaires `cash-adjustments.service.spec.ts` complétés avec succès pour couvrir la création et la récupération.
