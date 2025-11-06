# Script de test du serveur

Write-Host "🧪 Test du serveur Maison Pardailhé" -ForegroundColor Cyan
Write-Host ""

# Tester si le serveur répond
Write-Host "1. Test du serveur sur http://localhost:3001..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method HEAD -TimeoutSec 5
    Write-Host "✅ Serveur OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Serveur inaccessible. Assurez-vous qu'il tourne avec 'npm run dev'" -ForegroundColor Red
    exit 1
}

# Tester les fichiers statiques JS
Write-Host ""
Write-Host "2. Test fichier /js/menus.js..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/js/menus.js" -Method HEAD -TimeoutSec 5
    Write-Host "✅ menus.js OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ menus.js non trouvé (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Test fichier /js/app.js..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/js/app.js" -Method HEAD -TimeoutSec 5
    Write-Host "✅ app.js OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ app.js non trouvé (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Test fichier /js/toast.js..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/js/toast.js" -Method HEAD -TimeoutSec 5
    Write-Host "✅ toast.js OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ toast.js non trouvé (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
}

# Tester les routes API
Write-Host ""
Write-Host "5. Test API /api/menus..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/menus" -TimeoutSec 5
    $json = $response.Content | ConvertFrom-Json
    Write-Host "✅ API menus OK ($($json.Count) menus retournés)" -ForegroundColor Green
} catch {
    Write-Host "❌ API menus erreur (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
}

Write-Host ""
Write-Host "6. Test API /api/schedules..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/schedules" -TimeoutSec 5
    $json = $response.Content | ConvertFrom-Json
    Write-Host "✅ API schedules OK" -ForegroundColor Green
} catch {
    Write-Host "❌ API schedules erreur (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
}

# Tester les pages HTML
Write-Host ""
Write-Host "7. Test page /menu..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/menu" -Method HEAD -TimeoutSec 5
    Write-Host "✅ Page /menu OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Page /menu erreur (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
}

Write-Host ""
Write-Host "8. Test page 404..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/page-inexistante" -Method HEAD -TimeoutSec 5 -SkipHttpErrorCheck
    if ($response.StatusCode -eq 404) {
        Write-Host "✅ Page 404 OK (Status: 404)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Page 404 retourne status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors du test 404" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Tests terminés !" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Si des tests échouent :" -ForegroundColor Yellow
Write-Host "   1. Videz le cache navigateur (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "   2. Rafraîchissez avec Ctrl+F5" -ForegroundColor White
Write-Host "   3. Ou testez en navigation privée (Ctrl+Shift+N)" -ForegroundColor White
