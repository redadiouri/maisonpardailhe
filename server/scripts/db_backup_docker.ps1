# Script de backup MySQL pour environnement Docker (Windows)
#
# Ce script peut être exécuté:
# 1. Depuis l'hôte Docker (recommandé)
# 2. Via le Planificateur de tâches Windows
# 3. Manuellement

param(
    [string]$DbContainerName = "maisonpardailhe-db",
    [string]$DbName = "maisonpardailhe",
    [string]$DbUser = "maisonpardailhe_user",
    [string]$DbPassword = "",
    [string]$BackupDir = ".\backups",
    [int]$MaxBackups = 30
)

# Charger les variables d'environnement depuis .env si disponible
$EnvFile = Join-Path $PSScriptRoot "..\..\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ([string]::IsNullOrEmpty((Get-Variable -Name $name -ValueOnly -ErrorAction SilentlyContinue))) {
                Set-Variable -Name $name -Value $value -Scope Script
            }
        }
    }
}

# Créer le répertoire de backup
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✓ Répertoire de backup créé: $BackupDir" -ForegroundColor Green
}

# Nom du fichier avec timestamp
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFile = Join-Path $BackupDir "backup-$DbName-$Timestamp.sql"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 Backup Docker de la base de données" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📦 Conteneur: $DbContainerName"
Write-Host "💾 Base: $DbName"
Write-Host "📁 Fichier: $(Split-Path -Leaf $BackupFile)"
Write-Host ""

# Vérifier que le conteneur existe et tourne
$ContainerRunning = docker ps --format '{{.Names}}' | Where-Object { $_ -eq $DbContainerName }
if (-not $ContainerRunning) {
    Write-Host "❌ Erreur: Le conteneur '$DbContainerName' n'est pas en cours d'exécution" -ForegroundColor Red
    Write-Host "Conteneurs actifs:" -ForegroundColor Yellow
    docker ps --format "  - {{.Names}}"
    exit 1
}

# Exécuter mysqldump depuis le conteneur MySQL
Write-Host "⏳ Création du backup..."
try {
    $mysqldumpCmd = "mysqldump -u$DbUser -p$DbPassword --single-transaction --routines --triggers --events --complete-insert --hex-blob --default-character-set=utf8mb4 $DbName"
    
    docker exec $DbContainerName sh -c $mysqldumpCmd 2>$null | Out-File -FilePath $BackupFile -Encoding utf8
    
    if (Test-Path $BackupFile) {
        $Size = (Get-Item $BackupFile).Length
        $SizeMB = [math]::Round($Size / 1MB, 2)
        Write-Host "✓ Backup créé avec succès ($SizeMB MB)" -ForegroundColor Green
    } else {
        throw "Le fichier de backup n'a pas été créé"
    }
} catch {
    Write-Host "❌ Erreur lors de la création du backup: $_" -ForegroundColor Red
    if (Test-Path $BackupFile) {
        Remove-Item $BackupFile -Force
    }
    exit 1
}

# Rotation des backups
Write-Host ""
Write-Host "🗑️  Rotation des backups (max: $MaxBackups)..." -ForegroundColor Yellow
$Backups = Get-ChildItem -Path $BackupDir -Filter "backup-*.sql" | Sort-Object LastWriteTime -Descending
Write-Host "   Backups actuels: $($Backups.Count)"

if ($Backups.Count -gt $MaxBackups) {
    $ToDelete = $Backups.Count - $MaxBackups
    Write-Host "   Suppression de $ToDelete ancien(s) backup(s)..."
    
    $Backups | Select-Object -Skip $MaxBackups | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "   ✓ Supprimé: $($_.Name)" -ForegroundColor Yellow
    }
}

# Résumé des backups disponibles
Write-Host ""
Write-Host "📊 Backups disponibles (5 plus récents):" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Cyan
Get-ChildItem -Path $BackupDir -Filter "backup-*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    ForEach-Object {
        $SizeMB = [math]::Round($_.Length / 1MB, 2)
        $Date = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "   $($_.Name) | $Date | $SizeMB MB"
    }
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Backup terminé avec succès!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

exit 0
