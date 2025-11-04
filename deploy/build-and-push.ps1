<#
Build and push a Docker image for this project to Docker Hub.

Usage examples (PowerShell / pwsh):
  # Use env vars DOCKERHUB_USERNAME, DOCKERHUB_REPO, DOCKERHUB_TOKEN (optional), IMAGE_TAG
  pwsh ./deploy/build-and-push.ps1 -ContextPath server

  # Or pass parameters
  pwsh ./deploy/build-and-push.ps1 -Username myuser -Repo maisonpardailhe-server -Tag v1.0.0 -ContextPath server

Notes:
  - If DOCKERHUB_TOKEN is provided in the environment, the script will attempt 'docker login' using --password-stdin.
  - ContextPath defaults to 'server' (relative to repo root).
#>

param(
    [string]$Username = $env:DOCKERHUB_USERNAME,
    [string]$Repo = $env:DOCKERHUB_REPO,
    [string]$Tag = $env:IMAGE_TAG,
    # Directory where the Dockerfile lives (used for informational purposes).
    [string]$ContextPath = 'server',
    # The actual docker build context (defaults to repo root '.') so the Dockerfile
    # can COPY top-level folders like `maisonpardailhe`.
    [string]$BuildContext = '.',
    [string]$Dockerfile = "$PSScriptRoot/../server/Dockerfile",
    [switch]$NoLogin
)

function Write-Err([string]$msg){ Write-Host "ERROR: $msg" -ForegroundColor Red }

if (-not $Username -or -not $Repo) {
    Write-Err "Docker Hub username and repo are required. Set DOCKERHUB_USERNAME/DOCKERHUB_REPO env vars or pass -Username and -Repo."
    exit 2
}

$Tag = if ($Tag) { $Tag } else { 'latest' }

# Build image name using string concatenation to avoid interpolation issues with ':'
$image = $Username + '/' + $Repo + ':' + $Tag

Write-Host "Building image: $image"
Write-Host "Context: $ContextPath"
Write-Host "Dockerfile: $Dockerfile"

try {
    # Switch to the build context directory so relative paths in the build operate
    # from the correct root. Default BuildContext is '.' (repo root).
    Push-Location (Resolve-Path -Path $BuildContext)
} catch {
    Write-Err "Build context path '$BuildContext' not found. Run this script from the repo root or provide a valid -BuildContext."
    exit 3
}

try {
    if (-not $NoLogin -and $env:DOCKERHUB_TOKEN) {
        Write-Host "Logging into Docker Hub as $Username (using DOCKERHUB_TOKEN env)..."
        $token = $env:DOCKERHUB_TOKEN
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($token + "`n")
        $proc = Start-Process -FilePath docker -ArgumentList 'login','--username',$Username,'--password-stdin' -NoNewWindow -PassThru -RedirectStandardInput 'stdin' -RedirectStandardOutput 'stdout' -RedirectStandardError 'stderr'
        $proc.StandardInput.WriteLine($token)
        $proc.StandardInput.Close()
        $proc.WaitForExit()
        if ($proc.ExitCode -ne 0) { Write-Err "docker login failed. Ensure DOCKERHUB_TOKEN is correct."; exit 4 }
    }

    $buildArgs = @('build','-t',$image,'-f',$Dockerfile,$BuildContext)
    Write-Host "Running: docker $($buildArgs -join ' ')"
    $b = & docker @buildArgs
    if ($LASTEXITCODE -ne 0) { Write-Err "docker build failed"; exit 5 }

    Write-Host "Pushing image: $image"
    & docker push $image
    if ($LASTEXITCODE -ne 0) { Write-Err "docker push failed"; exit 6 }

    Write-Host "Image pushed: $image" -ForegroundColor Green
} finally {
    Pop-Location
}
