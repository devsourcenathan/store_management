# ============================================
# Script de rollback (retour à l'ancienne config)
# ============================================
# Usage: .\rollback.ps1

Write-Host "========================================" -ForegroundColor Red
Write-Host " ROLLBACK - RETOUR À L'ANCIENNE CONFIG" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "ATTENTION: Ce script va annuler la migration" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Voulez-vous vraiment effectuer un rollback? (O/N)"
if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Rollback annulé." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Étapes du rollback:" -ForegroundColor Yellow
Write-Host "1. Restaurer l'ancien docker-compose.prod.yml"
Write-Host "2. Redémarrer les services sur l'ancien EC2"
Write-Host "3. Restaurer les DNS"
Write-Host "4. Vérifier le fonctionnement"
Write-Host ""

$continue = Read-Host "Voulez-vous continuer? (O/N)"
if ($continue -ne "O" -and $continue -ne "o") {
    Write-Host "Rollback annulé." -ForegroundColor Yellow
    exit 0
}

# 1. Restaurer l'ancien docker-compose.prod.yml
Write-Host ""
Write-Host "1. Restauration de l'ancien docker-compose.prod.yml..." -ForegroundColor Yellow

$backupFile = "docker-compose.prod.yml.backup"
if (Test-Path $backupFile) {
    Copy-Item $backupFile "docker-compose.prod.yml" -Force
    Write-Host "   ✓ Fichier restauré" -ForegroundColor Green
} else {
    Write-Host "   ✗ Fichier de backup non trouvé" -ForegroundColor Red
    Write-Host "   Restauration manuelle nécessaire" -ForegroundColor Yellow
}

# 2. Instructions pour l'ancien EC2
Write-Host ""
Write-Host "2. Instructions pour l'ancien EC2:" -ForegroundColor Yellow
Write-Host "   a) Copiez docker-compose.prod.yml sur l'ancien EC2"
Write-Host "   b) Exécutez: docker compose up -d"
Write-Host "   c) Vérifiez: docker compose ps"
Write-Host ""

# 3. Instructions DNS
Write-Host "3. Restauration des DNS:" -ForegroundColor Yellow
Write-Host "   a) stock.sekuu.com → IP ancien EC2"
Write-Host "   b) stockapi.sekuu.com → IP ancien EC2"
Write-Host "   c) stock.byevastore.com → IP ancien EC2"
Write-Host ""

# 4. Nettoyage
Write-Host "4. Nettoyage:" -ForegroundColor Yellow
Write-Host "   a) Arrêtez les services sur le nouvel EC2"
Write-Host "   b) Supprimez le frontend de Vercel"
Write-Host ""

Write-Host "========================================" -ForegroundColor Red
Write-Host " ROLLBACK TERMINÉ" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Vérifiez que tout fonctionne:" -ForegroundColor Yellow
Write-Host "curl https://stockapi.sekuu.com/api/health"
Write-Host "curl https://stock.sekuu.com"
