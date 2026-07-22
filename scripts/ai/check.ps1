param(
    [ValidateSet("frontend", "backend", "rust", "all")]
    [string]$Scope = "frontend",

    [switch]$Full
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Invoke-Checked {
    param(
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments
    )

    Write-Host ""
    Write-Host "[$WorkingDirectory] $Executable $($Arguments -join ' ')" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & $Executable @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE: $Executable $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}

if ($Scope -in @("frontend", "all")) {
    $Frontend = Join-Path $RepoRoot "frontend"
    Invoke-Checked $Frontend "npm" @("run", "lint")
    Invoke-Checked $Frontend "npx" @("tsc", "--noEmit")
    Invoke-Checked $Frontend "npm" @("run", "test.unit", "--", "--run")
    Invoke-Checked $Frontend "npm" @("run", "build")
    if ($Full) {
        Invoke-Checked $Frontend "npx" @("cypress", "run")
    }
}

if ($Scope -in @("backend", "all")) {
    $Backend = Join-Path $RepoRoot "backend"
    Invoke-Checked $Backend "python" @("-m", "unittest", "discover", "-s", "tests", "-v")
    Invoke-Checked $Backend "python" @("-m", "validation.run_validation")
    Invoke-Checked $Backend "python" @("-m", "validation.export_golden_fixtures", "--check")
}

if ($Scope -in @("rust", "all")) {
    Invoke-Checked $RepoRoot "cargo" @("fmt", "--all", "--", "--check")
    Invoke-Checked $RepoRoot "cargo" @("clippy", "--workspace", "--all-targets", "--", "-D", "warnings")
    Invoke-Checked $RepoRoot "cargo" @("test", "--workspace")
}

Invoke-Checked $RepoRoot "git" @("diff", "--check")
Write-Host ""
Write-Host "Checks passed for scope: $Scope" -ForegroundColor Green
