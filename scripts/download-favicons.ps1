# Download RealFaviconGenerator output files into the public folder
# Usage: pwsh ./scripts/download-favicons.ps1

$destDir = "maisonpardailhe"
if (-not (Test-Path $destDir)) {
    Write-Error "Destination folder '$destDir' does not exist. Run this script from the repo root."
    exit 1
}

$files = @(
    @{ url = 'https://realfavicongenerator.net/files/99bc152e-e6a1-4209-a827-7cfea480316a/favicon.svg'; out = "$destDir/favicon.svg" },
    @{ url = 'https://realfavicongenerator.net/files/99bc152e-e6a1-4209-a827-7cfea480316a/favicon-96x96.png'; out = "$destDir/favicon-96x96.png" },
    @{ url = 'https://realfavicongenerator.net/files/99bc152e-e6a1-4209-a827-7cfea480316a/favicon.ico'; out = "$destDir/favicon.ico" },
    @{ url = 'https://realfavicongenerator.net/files/99bc152e-e6a1-4209-a827-7cfea480316a/apple-touch-icon.png'; out = "$destDir/apple-touch-icon.png" },
    @{ url = 'https://realfavicongenerator.net/files/99bc152e-e6a1-4209-a827-7cfea480316a/web-app-manifest-192x192.png'; out = "$destDir/web-app-manifest-192x192.png" },
    @{ url = 'https://realfavicongenerator.net/files/99bc152e-e6a1-4209-a827-7cfea480316a/web-app-manifest-512x512.png'; out = "$destDir/web-app-manifest-512x512.png" },
    @{ url = 'https://realfavicongenerator.net/files/99bc152e-e6a1-4209-a827-7cfea480316a/site.webmanifest'; out = "$destDir/site.webmanifest" }
)

foreach ($f in $files) {
    $url = $f.url
    $out = $f.out
    Write-Host "Downloading $url -> $out"
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing -ErrorAction Stop
        Write-Host "Saved: $out"
    }
    catch {
        Write-Error "Failed to download $url : $_"
    }
}

Write-Host "Done. If some downloads failed, re-run the script or visit the URL manually and save the file into $destDir."