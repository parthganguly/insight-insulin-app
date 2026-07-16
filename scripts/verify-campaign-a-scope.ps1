[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) {
	throw "Campaign A scope check must run inside a Git worktree."
}

$protectedPrefixes = @(
	"backend/",
	"crates/",
	"rust/"
)

$protectedFiles = @(
	"frontend/src/api/api.ts",
	"frontend/src/stores/currentMealStore.ts",
	"frontend/src/stores/persistentMealStore.ts",
	"frontend/src/utils/acuteScoreDisplay.ts",
	"frontend/src/utils/fiiTrustBoundary.ts",
	"frontend/src/utils/insulinImpactPresentation.ts",
	"frontend/src/utils/safetyCopy.ts",
	"frontend/src/utils/trendDisplay.ts"
)

$statusLines = @(& git -C $repoRoot status --porcelain=v1 --untracked-files=all)
$changedPaths = foreach ($line in $statusLines) {
	if ($line.Length -lt 4) { continue }
	$pathField = $line.Substring(3)
	foreach ($candidate in ($pathField -split " -> ")) {
		$candidate.Trim('"').Replace("\", "/")
	}
}

$violations = @(
	$changedPaths |
		Where-Object {
			$path = $_
			($protectedPrefixes | Where-Object { $path.StartsWith($_, [System.StringComparison]::OrdinalIgnoreCase) }).Count -gt 0 -or
			($protectedFiles | Where-Object { $path.Equals($_, [System.StringComparison]::OrdinalIgnoreCase) }).Count -gt 0
		} |
		Sort-Object -Unique
)

if ($violations.Count -gt 0) {
	Write-Error ("Campaign A protected-path violation(s):`n - " + ($violations -join "`n - "))
}

Write-Output ("Campaign A scope check passed: {0} tracked/untracked changed path(s), no protected paths." -f $changedPaths.Count)
