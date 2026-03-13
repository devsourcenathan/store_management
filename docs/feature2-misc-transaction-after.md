# Feature 2 : Suivi des mouvements non standard (MiscTransaction) - Implémentation réalisée

## Modèles Prisma
- Enum `MiscTransactionType` (`IN`, `OUT`)
- Modèle `MiscTransaction` créé avec les champs `id`, `storeId`, `date`, `type`, `amount`, `description`, `createdBy`, `createdAt`, `updatedAt`.

## Back-end (NestJS)
- **Module** : `MiscTransactionsModule`
- **Contrôleur** : `MiscTransactionsController`
  - `POST /misc-transactions` : Création transaction `IN` (Entrée) ou `OUT` (Sortie). Protégé par `JwtAuthGuard`. Enregistrement d'un log d'audit.
  - `GET /misc-transactions` : Liste des transactions avec filtres sur `storeId`, `type`, `startDate`, `endDate`.
- **Service** : `MiscTransactionsService` pour enregistrer en base et récupérer la data de façon sécurisée (Organization isolation).
- **DTOs** : `CreateMiscTransactionDto` validant strictement le `type` (Enum `IN/OUT`) et `amount` (> 0).

## Front-end (React / Ant Design)
- Route `/misc-transactions` ajoutée sous `DashboardLayout` dans `router.tsx`.
- Page `MiscTransactionsPage` créée et comprenant :
  - Un formulaire pour valider s'il s'agit d'un ajout (`IN`) ou d'un retrait (`OUT`) en caisse.
  - Un tableau listant les transactions, filtrable par boutique, type (Entrée/Sortie), et plage de dates. 
  - Des cartes statistiques montant le cumul des IN, des OUT, ainsi que le solde net global.

## Reports
- `ReportsService` mis à jour pour remonter les totaux d'entrées (autres revenus) et sorties (autres dépenses) dans les `DailyReport`/`MonthlyReport`.

## Tests et Audit
- Les actions de modification (`create`) sont persistées dans les audits de sécurité via l'`AuditService`.
- Tests unitaires `misc-transactions.service.spec.ts` valides avec une bonne couverture asynchrone pour ces méthodes.
