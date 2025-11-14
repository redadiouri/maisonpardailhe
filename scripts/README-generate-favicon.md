# Générer `favicon.ico`

Ce dépôt inclut un script PowerShell `scripts/generate-favicon.ps1` qui construit un `favicon.ico` multi-résolution à partir de `maisonpardailhe/img/logo.png`.

Pré-requis:
- PowerShell 7+ (ou Windows PowerShell avec .NET Framework qui expose `System.Drawing`).

Usage (depuis la racine du repo):

```powershell
pwsh ./scripts/generate-favicon.ps1
```

Le script va générer `maisonpardailhe/favicon.ico`. Tu peux personnaliser la source ou la sortie en passant des paramètres :

```powershell
pwsh ./scripts/generate-favicon.ps1 -Source "maisonpardailhe/img/logo.png" -Output "maisonpardailhe/favicon.ico"
```

Notes:
- Le script crée un ICO contenant des images PNG (format PNG-in-ICO), ce qui est compatible avec les navigateurs modernes.
- Si ton environnement n'a pas `System.Drawing` disponible, installe PowerShell 7+ et exécute depuis Windows où .NET est présent.
