<#
PowerShell script to generate favicon.ico from img/logo.png
Creates PNG sizes (16,32,48,64,128) in-memory and packages them into a single ICO file.
Usage (run from repo root):
    pwsh ./scripts/generate-favicon.ps1
#>

param(
    [string]$Source = "maisonpardailhe/img/logo.png",
    [string]$Output = "maisonpardailhe/favicon.ico",
    [int[]]$Sizes = @(16,32,48,64,128)
)

if (-not (Test-Path $Source)) {
    Write-Error "Source file not found: $Source"
    exit 2
}

Add-Type -AssemblyName System.Drawing

function Resize-ToPngBytes {
    param([System.Drawing.Image]$img, [int]$size)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $size, $size)
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $ms.ToArray()
}

try {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $Source).ProviderPath)
} catch {
    Write-Error "Unable to load image: $_"
    exit 3
}

$pngBytesList = @()

foreach ($s in $Sizes) {
    Write-Host "Generating PNG size ${s}x${s}..."
    $bytes = Resize-ToPngBytes -img $img -size $s
    $pngBytesList += @{ Size = $s; Bytes = $bytes }
}

$img.Dispose()

# Build ICO: ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes per image) + image data
$stream = [System.IO.File]::Create((Resolve-Path $Output).ProviderPath)
$bw = New-Object System.IO.BinaryWriter($stream)

# ICONDIR
$bw.Write([uint16]0)          # reserved
$bw.Write([uint16]1)          # type: 1 = icon
$bw.Write([uint16]$pngBytesList.Count)

# Calculate offsets: header (6) + entries (16 * count)
$offset = 6 + (16 * $pngBytesList.Count)

foreach ($entry in $pngBytesList) {
    $s = $entry.Size
    $bytes = $entry.Bytes
    # width and height: 1 byte each, 0 means 256
    $w = if ($s -ge 256) { 0 } else { [byte]$s }
    $h = if ($s -ge 256) { 0 } else { [byte]$s }
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0) # color count
    $bw.Write([byte]0) # reserved
    $bw.Write([uint16]0) # planes (0 for PNG)
    $bw.Write([uint16]32) # bit count
    $bw.Write([uint32]$bytes.Length) # bytes in image
    $bw.Write([uint32]$offset) # offset
    $offset += $bytes.Length
}

# Write image data
foreach ($entry in $pngBytesList) {
    $bw.Write($entry.Bytes)
}

$bw.Flush()
$bw.Close()
$stream.Close()

Write-Host "favicon.ico generated at: $Output"
