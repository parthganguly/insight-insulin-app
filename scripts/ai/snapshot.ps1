$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutputDir = Join-Path $RepoRoot ".pi\runs\$Stamp"
$OutputFile = Join-Path $OutputDir "evidence.md"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Push-Location $RepoRoot
try {
    $Remote = git remote -v | Out-String
    $Branch = git branch --show-current | Out-String
    $Head = git rev-parse HEAD | Out-String
    $Status = git status --short | Out-String
    $Names = git diff --name-only | Out-String
    $Stat = git diff --stat | Out-String
    $DiffCheck = git diff --check 2>&1 | Out-String
}
finally {
    Pop-Location
}

@"
# Agent evidence snapshot

- Created: $(Get-Date -Format o)
- Repository: $RepoRoot
- Branch: $($Branch.Trim())
- HEAD: $($Head.Trim())

## Remote

``````
$($Remote.Trim())
``````

## Status

``````
$($Status.Trim())
``````

## Changed files

``````
$($Names.Trim())
``````

## Diff stat

``````
$($Stat.Trim())
``````

## Diff check

``````
$($DiffCheck.Trim())
``````
"@ | Set-Content -Encoding UTF8 $OutputFile

Write-Host $OutputFile
