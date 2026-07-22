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
    Write-Host "Pi needs Node.js 22 or newer." -ForegroundColor Red
    if ($DetectedVersion) {
        Write-Host "This shell is using Node.js $DetectedVersion." -ForegroundColor Yellow
    } else {
        Write-Host "Node.js was not found in this shell." -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Install the current Node.js LTS release with Windows Package Manager:" -ForegroundColor Cyan
    Write-Host "  winget install --id OpenJS.NodeJS.LTS -e --source winget"
    Write-Host ""
    Write-Host "Or install the Windows LTS installer from:" -ForegroundColor Cyan
    Write-Host "  https://nodejs.org/en/download"
    Write-Host ""
    Write-Host "After installation:" -ForegroundColor Cyan
    Write-Host "  1. Close this PowerShell window."
    Write-Host "  2. Open a new PowerShell window."
    Write-Host "  3. Run: node -v"
    Write-Host "  4. Return to this worktree and rerun: .\scripts\setup-pi-windows.ps1"
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
    throw "npm was not found even though Node.js $NodeVersionText is installed. Repair the Node.js LTS installation, reopen PowerShell, and rerun this script."
}

$BashCandidates = @(
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
    throw "Git Bash was not found. Install Git for Windows first."
}

Write-Host "Installing @earendil-works/pi-coding-agent@$PiVersion..." -ForegroundColor Cyan
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
$Settings | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $GlobalSettingsPath

$LocalExclude = Join-Path $RepoRoot ".git\info\exclude"
$ExcludeLine = ".pi/runs/"
if (-not (Test-Path $LocalExclude)) {
    New-Item -ItemType File -Force -Path $LocalExclude | Out-Null
}
$ExcludeText = Get-Content $LocalExclude -Raw -ErrorAction SilentlyContinue
if ($ExcludeText -notmatch "(?m)^\.pi/runs/$") {
    Add-Content -Encoding UTF8 $LocalExclude "`n$ExcludeLine"
}

$InstalledVersion = Invoke-Captured "pi" @("--version")

Write-Host ""
Write-Host "Pi installed: $InstalledVersion" -ForegroundColor Green
Write-Host "Node.js: $NodeVersionText"
Write-Host "Git Bash: $BashPath"
Write-Host "Repository: $RepoRoot"
Write-Host ""
Write-Host "Next commands:"
Write-Host "  cd `"$RepoRoot`""
Write-Host "  pi"
Write-Host "  /login"
Write-Host ""
Write-Host "Review and trust this repository when Pi prompts. Never store API keys in the repository."
