# ============================================
# Script de configuration Vercel CLI
# ============================================
# Usage: .\setup-vercel.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CONFIGURATION VERCEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Vercel CLI est installé
try {
    $vercelVersion = & vercel --version 2>&1
    Write-Host "Vercel CLI détecté: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "Vercel CLI n'est pas installé" -ForegroundColor Yellow
    Write-Host "Installation..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host ""
Write-Host "Étapes de configuration:" -ForegroundColor Yellow
Write-Host "1. Connectez-vous à Vercel: vercel login"
Write-Host "2. Allez dans le dossier frontend: cd frontend"
Write-Host "3. Initialisez Vercel: vercel"
Write-Host "4. Configurez les variables d'environnement"
Write-Host "5. Ajoutez les domaines personnalisés"
Write-Host ""

# Instructions pour les variables d'environnement
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VARIABLES D'ENVIRONNEMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configurez ces variables dans le dashboard Vercel:" -ForegroundColor Yellow
Write-Host "Settings > Environment Variables"
Write-Host ""
Write-Host "VITE_API_URL = https://stockapi.sekuu.com/api"
Write-Host "VITE_SENTRY_DSN = https://8121455c923e6d952772266467899dd6@o4510816941113344.ingest.us.sentry.io/4510816944062464"
Write-Host "VITE_CLARITY_PROJECT_ID = vb5enlrofp"
Write-Host ""

# Instructions pour les domaines
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DOMAINES PERSONNALISÉS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ajoutez ces domaines dans le dashboard Vercel:" -ForegroundColor Yellow
Write-Host "Settings > Domains"
Write-Host ""
Write-Host "1. stock.sekuu.com"
Write-Host "2. stock.byevastore.com"
Write-Host "3. stockn.byevastore.com"
Write-Host "4. new.byevastore.com"
Write-Host ""
Write-Host "Configurez ensuite les DNS pour pointer vers Vercel" -ForegroundColor Yellow
