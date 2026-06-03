param(
  [switch] $DryRun,
  [switch] $Install,
  [switch] $Json,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $RemainingArgs
)

$script = Join-Path $PSScriptRoot 'install.mjs'
$argsList = @()
if ($Install) {
  $argsList += '--install'
} elseif ($DryRun) {
  $argsList += '--dry-run'
}
if ($Json) { $argsList += '--json' }
if ($RemainingArgs) { $argsList += $RemainingArgs }
node $script @argsList
exit $LASTEXITCODE
