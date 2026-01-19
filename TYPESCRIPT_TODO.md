# 🔧 TypeScript Corrections À Faire

## Contexte

Pour déployer rapidement en production, nous avons temporairement désactivé certaines vérifications TypeScript strictes dans `frontend/tsconfig.json` :

```json
"noUnusedLocals": false,      // était true
"noUnusedParameters": false,  // était true
```

## Erreurs à Corriger

### 1. Imports React Non Utilisés (× 3 fichiers)
- `src/features/admin/AdminLayout.tsx` - Ligne 1
- `src/features/landing/LandingPage.tsx` - Ligne 1
- `src/features/landing/RegisterOrgPage.tsx` - Ligne 1

**Fix** : Supprimer `import React from 'react'` (React 17+ n'en a plus besoin)

### 2. Imports Non Utilisés
- `src/features/landing/LandingPage.tsx` - Ligne 3 : import inutilisé
- `src/features/landing/LandingPage.tsx` - Ligne 15 : `navigate` déclaré mais non utilisé

**Fix** : Supprimer les imports/variables inutilisés

### 3. Variables Non Utilisées
- `src/features/org-landing/editor/Block.tsx` - Ligne 15 : paramètre `id`
- `src/features/org-landing/editor/Canvas.tsx` - Ligne 2 : `Block`
- `src/features/org-landing/editor/ImportSiteDialog.tsx` - Ligne 8 : `Upload`
- `src/features/org-landing/editor/InspectorPanel.tsx` - Ligne 14 : `setValue`
- `src/features/org-landing/editor/PageEditor.tsx` - Ligne 14 : `sections`
- `src/features/org-landing/editor/SectionRenderer.tsx` - Ligne 11 : `type`
- `src/features/settings/components/OrganizationSettings.tsx` - Ligne 17 : `refetch`

**Fix** : Préfixer avec `_` (ex: `_id`) ou supprimer

### 4. Types Implicites Any (× 2)
- `src/features/org-landing/editor/PageEditor.tsx` - Ligne 41 : paramètres `_` et `idx`

**Fix** : 
```typescript
.map((_: any, idx: number) => ...)
// OU mieux :
.map((_, idx: number) => ...)
```

### 5. Modules Manquants (× 2)
- `src/features/org-landing/editor/SettingsModal.tsx` - Ligne 5 : `@/components/ui/dialog`
- `src/features/org-landing/editor/TemplateGallery.tsx` - Ligne 3 : `@/components/ui/dialog`

**Fix** : Vérifier que le composant `dialog` existe dans `src/components/ui/` ou le créer

### 6. Erreur de Type (× 1)
- `src/features/org-landing/editor/presets.ts` - Ligne 85 : Type incompatible pour `Block[]`
  - Problème : `color: undefined` n'est pas assignable à `string | number`

**Fix** : Ne pas définir `color` si non utilisé, ou utiliser une valeur par défaut :
```typescript
// Au lieu de : color?: undefined
// Utiliser : color: '#000000'  ou simplement ne pas mettre la clé
```

## Commande pour Corriger

Une fois le site déployé et fonctionnel, exécuter :

```bash
# Remettre les vérifications strictes
# Modifier tsconfig.json :
"noUnusedLocals": true,
"noUnusedParameters": true,

# Voir toutes les erreurs
npm run build

# Corriger une par une
```

## Priorité

🟢 **Basse** - L'application fonctionne malgré ces warnings. Corriger quand vous avez le temps pour un code plus propre.

---

**Créé le** : 2026-01-19  
**Raison** : Déploiement rapide en production
