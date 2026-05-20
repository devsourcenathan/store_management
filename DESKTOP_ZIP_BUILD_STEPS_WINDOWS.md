# Build ZIP Desktop (Windows) — étapes exactes

Objectif: générer un **zip desktop** utilisable en local, avec:
- data dans `%APPDATA%\\StockManagement`
- images stockées sur disque (local)
- DB SQLite (client Prisma sqlite généré séparément)

## 0) Prérequis

- Node.js + npm installés
- Lancer les commandes depuis le repo: `C:\\Users\\nathan.tchinda\\projects\\stock`

## 1) Personnaliser le seed desktop (optionnel)

Édite `backend\\prisma\\desktop-seed.config.json` (organisation, magasins, utilisateurs, mots de passe).

Exemple de connexion par défaut:
- `owner@demo.com` / `password123`

## 2) Build zip desktop (tout-en-un)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\desktop
npm install
npm run dist:zip
```

`dist:zip` exécute automatiquement:
- génération SQLite + DB seedée (`backend\\generated\\desktop-stock.db`)
- build backend NestJS
- build frontend mode desktop (`VITE_DESKTOP=true`, API = même origine que l'UI)
- packaging Electron

Notes:
- Au **premier lancement**, la DB seedée est copiée vers `%APPDATA%\\StockManagement\\stock.db`.
- Pour repartir de zéro: supprime `%APPDATA%\\StockManagement\\stock.db` puis relance l'app.

## Build manuel (étape par étape)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\backend
npm install
npm run desktop:build-seed-db
npm run build

cd C:\Users\nathan.tchinda\projects\stock\frontend
npm install
npm run build:desktop

cd C:\Users\nathan.tchinda\projects\stock\desktop
npm install
npx electron-builder --win zip --publish never
```

Important:
- le backend NestJS tourne dans un processus enfant (`utilityProcess`), pas dans le processus UI Electron.
- si l'exe ne démarre pas, consulte `%APPDATA%\\StockManagement\\logs\\desktop.log` et `backend.log`.

## 4) Récupérer l’archive zip

Le zip est généré dans:
- `C:\\Users\\nathan.tchinda\\projects\\stock\\desktop\\dist\\`

## 5) Tester le zip (sur une machine Windows)

1. Dézipper
2. Lancer l’exécutable (StockManagement)
3. Vérifier que les données sont dans:
   - `%APPDATA%\\StockManagement\\`
   - médias: `%APPDATA%\\StockManagement\\media\\`

## Dépannage

- Si l’UI ne charge pas: refaire `frontend\\npm run build`, puis re-packager.
- Si le backend ne démarre pas: refaire `backend\\npm run build` + `backend\\npm run prisma:sqlite:generate`, puis re-packager.
