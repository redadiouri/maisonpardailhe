# Script de restauration MySQL pour environnement Docker (Windows)
#
# Usage:
#   .\db_restore_docker.ps1                    # Liste les backups disponibles
#   .\db_restore_docker.ps1 <fichier.sql>      # Restaure un backup spécifique
#   .\db_restore_docker.ps1 latest             # Restaure le plus récent

param(
    [string]$BackupFile = "",
    [string]$DbContainerName = "maisonpardailhe-db",
    [string]$DbName = "maisonpardailhe",
    [string]$DbUser = "maisonpardailhe_user",
    [string]$DbPassword = "",
    [string]$BackupDir = ".\backups"
)

# Charger .env
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

# Fonction pour lister les backups
function List-Backups {
    Write-Host "📦 Backups disponibles:" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    if (-not (Test-Path $BackupDir)) {
        Write-Host "❌ Répertoire de backup introuvable: $BackupDir" -ForegroundColor Red
        return $false
    }
    
    $Backups = Get-ChildItem -Path $BackupDir -Filter "backup-*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if ($Backups.Count -eq 0) {
        Write-Host "❌ Aucun backup trouvé dans: $BackupDir" -ForegroundColor Red
        return $false
    }
    
    $i = 1
    $Backups | ForEach-Object {
        $SizeMB = [math]::Round($_.Length / 1MB, 2)
        $Date = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        $Tag = if ($i -eq 1) { " [DERNIER]" } else { "" }
        Write-Host "$i. $($_.Name)$Tag"
        Write-Host "   📅 $Date | 💾 $SizeMB MB"
        $i++
    }
    
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    return $true
}

# Fonction de restauration
function Restore-Backup {
    param([string]$File)
    
    if (-not (Test-Path $File)) {
        Write-Host "❌ Fichier introuvable: $File" -ForegroundColor Red
        exit 1
    }
    
    $FileInfo = Get-Item $File
    $SizeMB = [math]::Round($FileInfo.Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "⚠️  ATTENTION: Cette opération va ÉCRASER la base de données actuelle!" -ForegroundColor Yellow
    Write-Host "   Base: $DbName"
    Write-Host "   Conteneur: $DbContainerName"
    Write-Host "   Fichier: $($FileInfo.Name)"
    Write-Host "   Taille: $SizeMB MB"
    Write-Host ""
    
    $Confirm = Read-Host "❓ Voulez-vous continuer? (oui/non)"
    if ($Confirm -ne "oui" -and $Confirm -ne "o") {
        Write-Host "❌ Restauration annulée" -ForegroundColor Red
        exit 0
    }
    
    # Vérifier que le conteneur existe
    $ContainerRunning = docker ps --format '{{.Names}}' | Where-Object { $_ -eq $DbContainerName }
    if (-not $ContainerRunning) {
        Write-Host "❌ Le conteneur '$DbContainerName' n'est pas en cours d'exécution" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "🔄 Restauration en cours..." -ForegroundColor Cyan
    
    try {
        # Restaurer via docker exec
        Get-Content $File | docker exec -i $DbContainerName mysql -u$DbUser -p$DbPassword --default-character-set=utf8mb4 $DbName 2>$null
        
        Write-Host "✅ Restauration terminée avec succès!" -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "❌ Erreur lors de la restauration: $_" -ForegroundColor Red
        exit 1
    }
}

# Programme principal
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 Restauration Docker de la base de données" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Si aucun argument, lister les backups
if ([string]::IsNullOrEmpty($BackupFile)) {
    if (List-Backups) {
        Write-Host ""
        Write-Host "Usage:"
        Write-Host "  .\db_restore_docker.ps1 <fichier.sql>  # Restaurer un backup"
        Write-Host "  .\db_restore_docker.ps1 latest         # Restaurer le plus récent"
    }
    exit 0
}

# Déterminer le fichier à restaurer
if ($BackupFile -eq "latest") {
    $LatestBackup = Get-ChildItem -Path $BackupDir -Filter "backup-*.sql" -ErrorAction SilentlyContinue | 
                    Sort-Object LastWriteTime -Descending | 
                    Select-Object -First 1
    
    if (-not $LatestBackup) {
        Write-Host "❌ Aucun backup disponible" -ForegroundColor Red
        exit 1
    }
    
    $BackupFile = $LatestBackup.FullName
    Write-Host "📂 Sélection du backup le plus récent: $($LatestBackup.Name)" -ForegroundColor Cyan
} else {
    # Si chemin absolu, utiliser tel quel, sinon chercher dans BACKUP_DIR
    if (Test-Path $BackupFile) {
        # Déjà un chemin valide
    } else {
        $BackupFile = Join-Path $BackupDir $BackupFile
    }
}

Restore-Backup -File $BackupFile
