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

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    throw "Run this script from a Git checkout of INSIGHT. Repository root: $RepoRoot"
}

$NodeVersionText = Invoke-Captured "node" @("-p", "process.versions.node")
$NodeMajor = [int]($NodeVersionText.Split(".")[0])
if ($NodeMajor -lt $MinimumNodeMajor) {
    throw "Pi requires Node.js 22 or newer. Found $NodeVersionText."
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
Write-Host "Git Bash: $BashPath"
Write-Host "Repository: $RepoRoot"
Write-Host ""
Write-Host "Next commands:"
Write-Host "  cd `"$RepoRoot`""
Write-Host "  pi"
Write-Host "  /login"
Write-Host ""
Write-Host "Review and trust this repository when Pi prompts. Never store API keys in the repository."
