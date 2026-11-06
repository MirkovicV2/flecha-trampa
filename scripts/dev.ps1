param([string]$Task = 'dev')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$portableNode = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools') -Directory -Filter 'node-v24*-win-x64' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if ($portableNode) { $env:Path = $portableNode.FullName + ';' + $env:Path }
Set-Location -LiteralPath $projectRoot
& npm.cmd run $Task
exit $LASTEXITCODE
