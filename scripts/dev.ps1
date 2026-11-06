param([string]$Task = 'dev')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'use-local-tools.ps1')
Set-Location -LiteralPath $projectRoot
& npm.cmd run $Task
exit $LASTEXITCODE
