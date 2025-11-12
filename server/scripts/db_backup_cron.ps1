# Script de backup quotidien pour Windows Task Scheduler
#
# Installation (Windows):
#   1. Ouvrir "Planificateur de tâches" (Task Scheduler)
#   2. Créer une tâche de base:
#      - Nom: "Backup BDD Maison Pardailhé"
#      - Déclencheur: Quotidien à 3h00
#      - Action: Démarrer un programme
#        Programme: powershell.exe
#        Arguments: -ExecutionPolicy Bypass -File "C:\chemin\vers\maisonpardailhe\server\scripts\db_backup_cron.ps1"
#      - Exécuter même si l'utilisateur n'est pas connecté
#
# Ou via PowerShell (exécuter en tant qu'administrateur):
#   $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\chemin\vers\maisonpardailhe\server\scripts\db_backup_cron.ps1`""
#   $trigger = New-ScheduledTaskTrigger -Daily -At 3am
#   Register-ScheduledTask -TaskName "Backup BDD Maison Pardailhé" -Action $action -Trigger $trigger -Description "Backup quotidien de la base de données"

# Répertoire du projet (à adapter selon votre installation)
$ProjectDir = "C:\Users\mehdi\Documents\GitHub\maisonpardailhe\server"

# Fichier de log
$LogFile = "$ProjectDir\backups\backup_cron.log"

# Se placer dans le répertoire du projet
Set-Location $ProjectDir

# Date/heure de début
$StartTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$LogMessage = @"
═══════════════════════════════════════════════════════════════
Backup automatique démarré: $StartTime
═══════════════════════════════════════════════════════════════
"@

Write-Host $LogMessage
Add-Content -Path $LogFile -Value $LogMessage

# Exécuter le script de backup
try {
    node scripts/db_backup_auto.js 2>&1 | Tee-Object -Append -FilePath $LogFile
    $ExitCode = $LASTEXITCODE
} catch {
    $ErrorMessage = "Erreur: $_"
    Write-Host $ErrorMessage -ForegroundColor Red
    Add-Content -Path $LogFile -Value $ErrorMessage
    $ExitCode = 1
}

# Date/heure de fin
$EndTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$LogMessage = @"
───────────────────────────────────────────────────────────────
Backup terminé: $EndTime
Code de sortie: $ExitCode
═══════════════════════════════════════════════════════════════

"@

Write-Host $LogMessage
Add-Content -Path $LogFile -Value $LogMessage

exit $ExitCode
