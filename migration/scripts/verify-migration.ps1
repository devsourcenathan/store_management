# ============================================
# Script de vérification post-migration
# ============================================
# Usage: .\verify-migration.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VÉRIFICATION POST-MIGRATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier la base de données Neon
Write-Host "1. Vérification de la base de données Neon..." -ForegroundColor Yellow
Write-Host "   Host: ep-nameless-wildflower-atnndy1x-pooler.c-9.us-east-1.aws.neon.tech"
Write-Host "   Database: neondb"
Write-Host ""

$neonTest = try {
    $env:PGPASSWORD = "npg_WhX3CJ5ctjOU"
    & psql -h "ep-nameless-wildflower-atnndy1x-pooler.c-9.us-east-1.aws.neon.tech" -p "5432" -U "neondb_owner" -d "neondb" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
    $LASTEXITCODE -eq 0
} catch {
    $false
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

if ($neonTest) {
    Write-Host "   ✓ Connexion à Neon réussie" -ForegroundColor Green
} else {
    Write-Host "   ✗ Échec de la connexion à Neon" -ForegroundColor Red
}

# 2. Vérifier le backend EC2
Write-Host ""
Write-Host "2. Vérification du backend EC2..." -ForegroundColor Yellow
Write-Host "   URL: https://stockapi.sekuu.com"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "https://stockapi.sekuu.com/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Backend accessible" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Backend répond avec le code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Backend inaccessible: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Vérifier le frontend Vercel
Write-Host ""
Write-Host "3. Vérification du frontend Vercel..." -ForegroundColor Yellow
Write-Host "   URLs: stock.sekuu.com, stock.byevastore.com"
Write-Host ""

$frontendUrls = @(
    "https://stock.sekuu.com",
    "https://stock.byevastore.com"
)

foreach ($url in $frontendUrls) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✓ $url accessible" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ $url répond avec le code: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ✗ $url inaccessible: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 4. Vérifier les DNS
Write-Host ""
Write-Host "4. Vérification des DNS..." -ForegroundColor Yellow
Write-Host ""

$dnsChecks = @(
    @{ Name = "stock.sekuu.com (Frontend)"; Host = "stock.sekuu.com" },
    @{ Name = "stockapi.sekuu.com (Backend)"; Host = "stockapi.sekuu.com" }
)

foreach ($check in $dnsChecks) {
    try {
        $dns = Resolve-DnsName -Name $check.Host -ErrorAction Stop
        Write-Host "   ✓ $($check.Name) résolu" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ $($check.Name) non résolu" -ForegroundColor Red
    }
}

# 5. Vérifier la connectivité API
Write-Host ""
Write-Host "5. Vérification de la connectivité API..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "https://stockapi.sekuu.com/api" -UseBasicParsing -TimeoutSec 10
    Write-Host "   ✓ API accessible depuis l'extérieur" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ API: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Résumé
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " RÉSUMÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si toutes les vérifications sont vertes," -ForegroundColor Green
Write-Host "la migration est terminée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "En cas d'erreur, consultez le guide de dépannage:" -ForegroundColor Yellow
Write-Host "migration/DEPLOYMENT-GUIDE.md"
