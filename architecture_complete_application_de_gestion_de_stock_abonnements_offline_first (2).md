# 📦 Application de gestion de stock & abonnements (Offline‑First)

## Table des matières
1. Vision générale
2. Concepts fondamentaux
   - 2.1 Organisation
   - 2.2 Utilisateur
   - 2.3 Boutique (Store)
3. Gestion des produits & du stock
   - 3.1 Catégorisation des produits
   - 3.2 Produit
   - 3.3 Prix par boutique
   - 3.4 Stock (principe clé)
   - 3.5 Mouvement de stock (source de vérité)
   - 3.6 Alertes stock
   - 3.7 Gestion des images
4. Ventes & paiements
   - 4.1 Vente
   - 4.2 Articles de vente
   - 4.3 Paiements
5. Clients
6. Approvisionnements & fournisseurs
   - 6.1 Fournisseur
   - 6.2 Approvisionnement
   - 6.3 Articles d’approvisionnement
7. Abonnements (services tiers)
   - 7.1 Principe
   - 7.2 Service
   - 7.3 Offre (Plan)
   - 7.4 Options (Add‑ons)
   - 7.5 Règles de tarification (Pricing Rules)
   - 7.6 Offre par boutique
   - 7.7 Abonnement
   - 7.8 Renouvellement (réabonnement)
8. Solde abonnement (services tiers)
   - 8.1 Problématique
   - 8.2 Compte de solde (ledger)
   - 8.3 Injection de solde
   - 8.4 Consommation du solde
   - 8.5 Alertes de solde
9. Offline‑First & synchronisation
   - 9.1 Principes
   - 9.2 Synchronisation
   - 9.3 Gestion des conflits
10. Architecture technique
11. Sécurité & permissions
12. Conclusion

---

## 1. Vision générale
Application **PWA offline‑first** destinée à la gestion de stock, de ventes et d’abonnements (services tiers type Canal+, Netflix), utilisable par **plusieurs organisations**, **plusieurs boutiques** et **plusieurs utilisateurs simultanément**, avec synchronisation automatique online/offline.

Objectifs clés :
- Fonctionnement **online et offline**
- **Multi‑utilisateurs**, multi‑boutiques, multi‑organisations
- Gestion complète du **stock**, des **ventes**, des **paiements**, des **abonnements**
- Historique, audit et traçabilité totale
- Architecture extensible et robuste

---

## 2. Concepts fondamentaux

### 2.1 Organisation
Entité racine représentant une entreprise ou un groupe.
- id
- name
- ownerId
- createdAt

Une organisation contient plusieurs boutiques et utilisateurs.

### 2.2 Utilisateur
- id
- email

Relation utilisateur / organisation :
- userId
- orgId
- role (owner, manager, staff)

Un utilisateur peut appartenir à plusieurs organisations.

### 2.3 Boutique (Store)
Point de vente.
- id
- orgId
- name
- location
- currency
- createdAt

Plusieurs utilisateurs peuvent travailler simultanément dans une boutique.

---

## 3. Gestion des produits & du stock

### 3.1 Catégorisation des produits
La catégorisation permet :
- organisation claire du stock
- filtres avancés
- statistiques par type de produit
- règles métier spécifiques

#### Structure des catégories
- **Hiérarchiques** : parent/enfant (ex: Électronique > Téléphones > Smartphones)
- **Globales vs locales** : système vs organisation
- Un produit peut appartenir à **une catégorie principale** et plusieurs secondaires

#### Attributs dynamiques
- Champs personnalisés selon la catégorie (ex: IMEI pour téléphones, durée pour abonnements)
- Configurables via l’admin
- Synchronisables offline

### 3.2 Produit
Produit logique, partagé au niveau organisation.
- id
- orgId
- sku
- name
- unit
- minStock
- createdAt

### 3.3 Prix par boutique
Le prix dépend de la boutique.
- id
- storeId
- productId
- price
- updatedAt

Historique du prix conservé au moment de la vente.

### 3.4 Stock (principe clé)
⚠️ Le stock **n’est jamais stocké comme une valeur fixe**.
- Stock calculé à partir des mouvements
```text
Stock = somme des quantités des mouvements
```

### 3.5 Mouvement de stock (source de vérité)
- id
- productId
- storeId
- type (IN | OUT | ADJUST | RETURN)
- quantity
- reason
- source (SALE | SUPPLY | RETURN | MANUAL)
- createdAt
- createdBy

### 3.6 Alertes stock
- id
- productId
- storeId
- type (NEGATIVE | BELOW_MIN)
- createdAt
- resolved

### 3.7 Gestion des images
- Les images sont **toujours stockées en ligne** (S3, Supabase Storage, Cloudinary)
- Offline : affichage de **placeholders génériques** pour chaque produit / offre / abonnement
- Modèle de données :
```json
ProductImage {
  "id": "uuid",
  "productId": "uuid",
  "filename": "image.jpg",
  "url": "https://cdn.example.com/image.jpg",
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "createdAt": "timestamp"
}
```
- Backend fournit uniquement les URLs
- Sécurité : URLs publiques ou signées, contrôle par boutique / organisation
- Optimisations : lazy loading, thumbnails, placeholders dynamiques pour UX offline

---

## 4. Ventes & paiements
### 4.1 Vente
- id
- storeId
- total
- status (PAID | PARTIAL | UNPAID)
- createdAt
- createdBy

### 4.2 Articles de vente
- id
- saleId
- productId
- quantity
- priceAtSale

### 4.3 Paiements
- id
- referenceType (SALE | SUBSCRIPTION)
- referenceId
- amount
- method
- createdAt

Fonctionnalités : paiement partiel, crédit, remboursements

---

## 5. Clients
- id
- name
- phone
- balance

Fonctionnalités : historique, dettes, alertes crédit

---

## 6. Approvisionnements & fournisseurs
### 6.1 Fournisseur
- id
- name
- contact

### 6.2 Approvisionnement
- id
- storeId
- supplierId
- createdAt

### 6.3 Articles d’approvisionnement
- id
- supplyId
- productId
- quantity
- cost

---

## 7. Abonnements (services tiers)
### 7.1 Principe
Abonnement = vente de service récurrent, pas un produit stockable

### 7.2 Service
- id
- name
- provider

### 7.3 Offre (Plan)
- id
- serviceId
- name
- duration (jours)
- basePrice
- description

### 7.4 Options (Add‑ons)
- id
- name
- description
⚠️ Pas de prix fixe

### 7.5 Règles de tarification (Pricing Rules)
- id
- targetType (OFFER | OPTION)
- targetId
- condition (JSON)
- price
- priority
- active

### 7.6 Offre par boutique
- id
- storeId
- offerId
- price
- isActive

### 7.7 Abonnement
- id
- customerId
- storeId
- offerId
- startDate
- endDate
- status (ACTIVE | EXPIRED | SUSPENDED)

### 7.8 Renouvellement (réabonnement)
Append‑only
- id
- subscriptionId
- duration
- price
- createdAt
- createdBy

---

## 8. Solde abonnement (services tiers)
### 8.1 Problématique
Solde préchargé par services tiers, multi‑vendeurs, offline possible

### 8.2 Compte de solde (ledger)
- id
- serviceId
- storeId

### 8.3 SubscriptionBalanceMovement
- id
- accountId
- type (CREDIT | DEBIT | ADJUST)
- amount
- source (INJECTION | SUBSCRIPTION | REFUND | CORRECTION)
- referenceId
- createdAt
- createdBy

### 8.4 Injection de solde
- Mouvement CREDIT, ex. chaque matin

### 8.5 Consommation du solde
- Mouvement DEBIT pour chaque abonnement/renouvellement
- Solde temporairement négatif autorisé

### 8.6 Alertes de solde
- id
- accountId
- type (NEGATIVE | LOW)
- threshold
- createdAt
- resolved

---

## 9. Offline‑First & synchronisation
### 9.1 Principes
Base locale = source de vérité temporaire, append-only, UUID client

### 9.2 Synchronisation
- PUSH : événements locaux
- PULL : récupérer événements serveur

### 9.3 Gestion des conflits
- Très rares, résolus par ordre temporel
- Alertes plutôt que blocage

---

## 10. Architecture technique
```text
UI (React PWA)
 ↓
IndexedDB / Cache API (offline uniquement pour données métier)
 ↓
Stock Engine / Pricing Engine / Subscription Engine
 ↓
Sync Engine
 ↓
API (Node.js)
 ↓
Cloud Storage (images)
 ↓
PostgreSQL
```

---

## 11. Sécurité & permissions
- Injection solde : admin
- Ajustement stock / solde : manager
- Vente / abonnement : staff
- Audit complet

---

## 12. Conclusion
Plateforme complète : gestion stock, ventes, abonnements, solde fournisseur, multi‑utilisateurs, offline‑first, traçabilité totale, images en ligne avec placeholders offline.

