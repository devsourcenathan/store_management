# Desktop Release — Build .exe avec auto-mise à jour

## Architecture

```
Développeur                         Client
    │                                  │
    ├─ npm version 1.2.0               │
    ├─ git tag v1.2.0                  │
    ├─ git push --tags                 │
    │       │                          │
    │  GitHub Actions                  │
    │  ┌────────────────────┐          │
    │  │ Build backend      │          │
    │  │ Build frontend     │          │
    │  │ electron-builder   │          │
    │  │ → NSIS .exe        │          │
    │  │ → GitHub Release   │──────────┤
    │  └────────────────────┘          │
    │                          L'app détecte la MAJ
    │                          ↓ Télécharge
    │                          ↓ Propose redémarrage
    │                          ↓ Installe automatiquement
```

## Prérequis : configurer le GitHub Token

Le workflow GitHub Actions a besoin d'un **Personal Access Token (PAT)** pour publier les releases.

### Étape 1 : Créer le token

1. Va sur https://github.com/settings/tokens?type=beta (Fine-grained tokens)
2. Clique **"Generate new token"**
3. Configure :
   - **Token name** : `desktop-release`
   - **Expiration** : 90 jours (ou plus)
   - **Repository access** : sélectionne `devsourcenathan/store_management`
   - **Permissions** :
     - **Contents** : Read and write (pour créer les releases)
4. Clique **"Generate token"**
5. **Copie le token** (il ne sera plus visible après)

### Étape 2 : Ajouter le secret dans le repo

1. Va sur https://github.com/devsourcenathan/store_management/settings/secrets/actions
2. Clique **"New repository secret"**
3. Configure :
   - **Name** : `GH_TOKEN`
   - **Secret** : colle le token copié à l'étape 1
4. Clique **"Add secret"**

## Publier une nouvelle version

### 1. Mettre à jour la version

```powershell
cd C:\Users\nathan.tchinda\projects\stock\desktop
npm version <major|minor|patch>
# Exemple : npm version patch  →  0.1.0 → 0.1.1
# Exemple : npm version minor  →  0.1.0 → 0.2.0
# Exemple : npm version major  →  0.1.0 → 1.0.0
```

> `npm version` met à jour `package.json` et crée automatiquement un commit + tag Git.

### 2. Pousser le tag

```powershell
git push origin main --tags
```

### 3. Vérifier le build

1. Va sur https://github.com/devsourcenathan/store_management/actions
2. Le workflow **"Build & Publish Desktop"** doit être en cours
3. Une fois terminé, la release apparaît dans https://github.com/devsourcenathan/store_management/releases

## Build local (sans publier)

Pour tester le `.exe` localement sans publier sur GitHub :

```powershell
cd C:\Users\nathan.tchinda\projects\stock\desktop
npm install
npm run dist:exe
```

Le fichier `.exe` sera dans `desktop\dist\StockManagement-Setup-X.Y.Z.exe`.

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dist:zip` | Build zip (ancien format, sans auto-update) |
| `npm run dist:exe` | Build installateur .exe NSIS (local, sans publier) |
| `npm run dist:publish` | Build .exe + publie sur GitHub Releases |

## Comment fonctionne l'auto-mise à jour

1. **Au démarrage** : 10 secondes après le lancement, l'app vérifie les releases GitHub
2. **Si une mise à jour existe** : l'utilisateur voit un dialogue « Télécharger ? »
3. **Pendant le téléchargement** : la barre de progression Windows s'affiche dans la taskbar
4. **Une fois téléchargé** : dialogue « Redémarrer maintenant ? »
5. **Si "Plus tard"** : la mise à jour s'installe automatiquement au prochain redémarrage
6. **Vérification périodique** : toutes les 4 heures

## Dépannage

### L'auto-update ne fonctionne pas

- Vérifier les logs : `%APPDATA%\StockManagement\logs\desktop.log`
- En mode dev (`npm run start`), l'auto-updater est **désactivé** (car `app.isPackaged === false`)
- Le repo doit être **public** ou le token doit avoir les permissions correctes

### Windows SmartScreen bloque l'exe

- Sans certificat de signature de code, Windows affiche un avertissement au premier téléchargement
- L'utilisateur peut cliquer "Informations complémentaires" → "Exécuter quand même"
- Pour supprimer cet avertissement, il faut un certificat de signature de code (payant, ~200€/an)

### Le workflow GitHub Actions échoue

- Vérifier que le secret `GH_TOKEN` est bien configuré
- Vérifier que le tag est au format `v*` (ex: `v1.0.0`)
- Consulter les logs du workflow sur https://github.com/devsourcenathan/store_management/actions
