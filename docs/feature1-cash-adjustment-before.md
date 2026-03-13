# Feature 1 : Gestion des écarts de caisse (CashAdjustment)
## Documentation pré-implémentation

**Date :** 2026-03-13  
**Auteur :** Senior Developer  
**Statut :** À implémenter

---

## Objectif

À la fin de chaque journée ou période, un gestionnaire ou propriétaire doit pouvoir enregistrer un **écart de caisse** : la différence entre le montant attendu (calculé par le système à partir des ventes) et le montant réellement compté dans la caisse physique. Cela permet de détecter des surplus ou des manquants et d'en conserver une trace analytique.

---

## Modèle de données Prisma

### Nouveau modèle : `CashAdjustment`

```prisma
model CashAdjustment {
  id             String   @id @default(uuid())
  storeId        String
  organizationId String
  date           DateTime @default(now())
  expected       Decimal  @db.Decimal(10, 2)  // Total attendu (ventes de la journée)
  counted        Decimal  @db.Decimal(10, 2)  // Total compté physiquement
  difference     Decimal  @db.Decimal(10, 2)  // counted - expected (négatif = manquant, positif = surplus)
  reason         String?                       // Explication de l'écart
  createdBy      String                        // ID de l'utilisateur qui enregistre
  createdAt      DateTime @default(now())

  @@index([storeId, date])
  @@index([organizationId, date])
  @@map("cash_adjustments")
}
```

**Règle de calcul :**
- `difference = counted - expected`
- Si `difference < 0` → **Manquant** (déficit)
- Si `difference > 0` → **Surplus** (excédent)
- Si `difference = 0` → **Caisse équilibrée**

---

## Routes REST (API)

| Méthode | Endpoint                | Description                          | Auth         |
|---------|-------------------------|--------------------------------------|--------------|
| `POST`  | `/cash-adjustments`     | Enregistrer un nouvel ajustement     | JWT Required |
| `GET`   | `/cash-adjustments`     | Lister les ajustements (filtrable)   | JWT Required |

### `POST /cash-adjustments`

**Body (JSON) :**
```json
{
  "storeId": "uuid-de-la-boutique",
  "date": "2026-03-13T00:00:00.000Z",  // optionnel, défaut = now()
  "expected": 150000,
  "counted": 148500,
  "reason": "Erreur de rendu de monnaie"
}
```

**Réponse 201 :**
```json
{
  "id": "uuid",
  "storeId": "uuid",
  "organizationId": "uuid",
  "date": "2026-03-13T00:00:00.000Z",
  "expected": "150000.00",
  "counted": "148500.00",
  "difference": "-1500.00",
  "reason": "Erreur de rendu de monnaie",
  "createdBy": "user-uuid",
  "createdAt": "2026-03-13T17:00:00.000Z"
}
```

### `GET /cash-adjustments`

**Query params :**
- `storeId` (optionnel)
- `startDate` (optionnel, ISO 8601)
- `endDate` (optionnel, ISO 8601)
- `createdBy` (optionnel, filtrer par utilisateur)

**Réponse 200 :**
```json
[
  {
    "id": "uuid",
    "date": "2026-03-12T00:00:00.000Z",
    "expected": "150000.00",
    "counted": "152000.00",
    "difference": "2000.00",
    "reason": "Vente non enregistrée retrouvée",
    "createdBy": "user-uuid",
    "store": { "name": "Boutique Centre" }
  }
]
```

---

## Validation (class-validator)

| Champ      | Règle                                              |
|------------|----------------------------------------------------|
| `storeId`  | `@IsUUID()`, `@IsNotEmpty()`                       |
| `expected` | `@IsNumber()`, `@Min(0)`                           |
| `counted`  | `@IsNumber()`, `@Min(0)`                           |
| `date`     | `@IsDateString()`, `@IsOptional()`                 |
| `reason`   | `@IsString()`, `@IsOptional()`, `@MaxLength(500)`  |

---

## Formulaire Front-end

### Champs du formulaire

| Champ            | Type            | Comportement                                                   |
|------------------|-----------------|----------------------------------------------------------------|
| Total attendu    | Input (readonly)| Prérempli avec le CA de la journée ou saisi manuellement      |
| Total compté     | InputNumber     | Saisie manuelle du montant physique en caisse                   |
| Différence       | Affichage auto  | Calculé en temps réel : `compté - attendu`, coloré vert/rouge  |
| Raison           | TextArea        | Explication libre de l'écart (optionnel)                        |

### Tableau d'affichage

Colonnes : Date | Boutique | Total attendu | Total compté | Différence | Raison | Créé par  
Filtres : Plage de dates | Boutique

---

## Architecture module NestJS

```
backend/src/modules/cash-adjustments/
├── dto/
│   └── create-cash-adjustment.dto.ts
├── cash-adjustments.service.ts
├── cash-adjustments.controller.ts
└── cash-adjustments.module.ts
```

---

## Dépendances

- **Back-end :** `@nestjs/common`, `PrismaService`, `AuditService`, `class-validator`
- **Front-end :** `antd` (Form, InputNumber, DatePicker, Table, Tag), `@tanstack/react-query`, `api` (axios)

---

## Impact sur les rapports

Les données seront incorporées dans :
- **Rapport journalier** : résumé des ajustements de caisse du jour (nb, total surplus, total déficit)
- **Rapport mensuel** : vue d'ensemble des écarts sur le mois
