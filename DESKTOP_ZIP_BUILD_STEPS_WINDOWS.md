# Build ZIP Desktop (Windows) — étapes exactes

Objectif: générer un **zip desktop** utilisable en local, avec:
- data dans `%APPDATA%\\StockManagement`
- images stockées sur disque (local)
- DB SQLite (client Prisma sqlite généré séparément)

## 0) Prérequis

- Node.js + npm installés
- Lancer les commandes depuis le repo: `C:\\Users\\nathan.tchinda\\projects\\stock`

## 1) Build frontend (UI)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\frontend
npm install
npm run build
```

## 2) Build backend (API)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\backend
npm install
npm run prisma:sqlite:generate
npm run build
```

Notes:
- `npm run prisma:sqlite:generate` génère `backend\\generated\\schema.sqlite.prisma` + `backend\\generated\\sqlite-client\\...` (non commit).
- Le mode bundle utilise `DB_PROVIDER=sqlite` (injecté par Electron) et place la DB dans `%APPDATA%\\StockManagement\\stock.db`.

## 3) Build zip desktop (Electron)

```powershell
cd C:\Users\nathan.tchinda\projects\stock\desktop
npm install
npm run dist:zip
```

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

