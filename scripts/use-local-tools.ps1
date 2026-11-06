# Select project tools without changing the caller error policy.
$flechaRoot = Split-Path -Parent $PSScriptRoot
$flechaTools = Join-Path $flechaRoot '.tools'
if (Test-Path -LiteralPath $flechaTools) {
  $flechaNode = Get-ChildItem -LiteralPath $flechaTools -Directory -Filter 'node-v24*-win-x64' |
    Sort-Object @{Expression = { [version]($_.Name -replace '^node-v', '' -replace '-win-x64$', '') }} -Descending |
    Select-Object -First 1
  if ($flechaNode) { $env:Path = $flechaNode.FullName + ';' + $env:Path }
  $flechaGh = Join-Path $flechaTools 'gh\bin'
  if (Test-Path -LiteralPath $flechaGh) { $env:Path = $flechaGh + ';' + $env:Path }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 24 para utilizar este proyecto.' }
$flechaNodeVersion = & node --version
if ($flechaNodeVersion -notmatch '^v24\.') { throw ('Se requiere Node.js 24; se ha encontrado ' + $flechaNodeVersion + '. Instala Node 24 o utiliza la copia portatil de .tools.') }
