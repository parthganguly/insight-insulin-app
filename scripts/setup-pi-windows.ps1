param()

$ErrorActionPreference = "Stop"
$PiVersion = "0.80.10"
$MinimumNodeMajor = 22
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-Captured {
    param(
        [string]$Executable,
        [string[]]$Arguments
    )

    $Output = & $Executable @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$Executable failed: $($Output | Out-String)"
    }
    return ($Output | Out-String).Trim()
}

function Stop-ForNodeUpgrade {
    param([string]$DetectedVersion)

    Write-Host ""
    Write-Host "Pi needs native Windows Node.js 22 or newer." -ForegroundColor Red
    if ($DetectedVersion) {
        Write-Host "This PowerShell session is using Node.js $DetectedVersion." -ForegroundColor Yellow
    } else {
        Write-Host "Node.js was not found in this PowerShell session." -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Install the current Windows x64 LTS release from the official Node.js download page:" -ForegroundColor Cyan
    Write-Host "  https://nodejs.org/en/download"
    Write-Host ""
    Write-Host "Then close PowerShell completely, open a new PowerShell window, and verify:" -ForegroundColor Cyan
    Write-Host "  node -v"
    Write-Host "  npm -v"
    Write-Host "  where.exe node"
    Write-Host ""
    Write-Host "The MSYS2 Node installation does not satisfy this native Windows check." -ForegroundColor Yellow
    Write-Host "MSYS2 is used as Pi's Bash backend; Pi itself should run from PowerShell/Windows Terminal."
    Write-Host ""
    exit 1
}

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    throw "Run this script from a Git checkout of INSIGHT. Repository root: $RepoRoot"
}

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCommand) {
    Stop-ForNodeUpgrade -DetectedVersion ""
}

$NodeVersionText = Invoke-Captured "node" @("-p", "process.versions.node")
$NodeMajor = [int]($NodeVersionText.Split(".")[0])
if ($NodeMajor -lt $MinimumNodeMajor) {
    Stop-ForNodeUpgrade -DetectedVersion $NodeVersionText
}

$NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
if (-not $NpmCommand) {
    throw "npm was not found even though Node.js $NodeVersionText is installed. Repair the native Windows Node.js LTS installation, reopen PowerShell, and rerun this script."
}

$BashCandidates = @(
    "C:\msys64\usr\bin\bash.exe",
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files\Git\usr\bin\bash.exe"
)
$BashPath = $BashCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $BashPath) {
    $BashCommand = Get-Command bash.exe -ErrorAction SilentlyContinue
    if ($BashCommand) {
        $BashPath = $BashCommand.Source
    }
}
if (-not $BashPath) {
    throw "No supported Bash executable was found. Install MSYS2 or Git for Windows, then rerun this script."
}

Write-Host "Installing native Windows @earendil-works/pi-coding-agent@$PiVersion..." -ForegroundColor Cyan
& npm install -g --ignore-scripts "@earendil-works/pi-coding-agent@$PiVersion"
if ($LASTEXITCODE -ne 0) {
    throw "Pi installation failed."
}

$GlobalConfigDir = Join-Path $HOME ".pi\agent"
$GlobalSettingsPath = Join-Path $GlobalConfigDir "settings.json"
New-Item -ItemType Directory -Force -Path $GlobalConfigDir | Out-Null

$Settings = @{}
if (Test-Path $GlobalSettingsPath) {
    $Existing = Get-Content $GlobalSettingsPath -Raw | ConvertFrom-Json
    foreach ($Property in $Existing.PSObject.Properties) {
        $Settings[$Property.Name] = $Property.Value
    }
}
$Settings["shellPath"] = $BashPath
$SettingsJson = $Settings | ConvertTo-Json -Depth 20
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $GlobalSettingsPath,
    $SettingsJson + [Environment]::NewLine,
    $Utf8NoBom
)

$LocalExcludeRaw = Invoke-Captured "git" @("-C", $RepoRoot, "rev-parse", "--git-path", "info/exclude")
if ([System.IO.Path]::IsPathRooted($LocalExcludeRaw)) {
    $LocalExclude = $LocalExcludeRaw
} else {
    $LocalExclude = Join-Path $RepoRoot $LocalExcludeRaw
}
$LocalExcludeDir = Split-Path $LocalExclude -Parent
New-Item -ItemType Directory -Force -Path $LocalExcludeDir | Out-Null
if (-not (Test-Path $LocalExclude)) {
    New-Item -ItemType File -Force -Path $LocalExclude | Out-Null
}
$ExcludeText = Get-Content $LocalExclude -Raw -ErrorAction SilentlyContinue
if ($ExcludeText -notmatch "(?m)^\.pi/runs/$") {
    Add-Content -Encoding UTF8 $LocalExclude "`n.pi/runs/"
}

$InstalledVersion = Invoke-Captured "pi" @("--version")

Write-Host ""
Write-Host "Pi installed: $InstalledVersion" -ForegroundColor Green
Write-Host "Native Windows Node.js: $NodeVersionText"
Write-Host "Bash backend: $BashPath"
Write-Host "Repository: $RepoRoot"
Write-Host ""
Write-Host "Next commands in this PowerShell window:"
Write-Host "  cd `"$RepoRoot`""
Write-Host "  pi"
Write-Host "  /login"
Write-Host ""
Write-Host "Review and trust this repository when Pi prompts. Never store API keys in the repository."
