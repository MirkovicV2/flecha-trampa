$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'use-local-tools.ps1')
$protectionOwner = gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or -not $protectionOwner) { throw 'No se pudo verificar la identidad autenticada.' }
$protectionRepo = $protectionOwner.Trim() + '/flecha-trampa'
$protectionBody = Join-Path $PSScriptRoot 'branch-protection.json'
gh api --method PUT ('repos/' + $protectionRepo + '/branches/main/protection') --input $protectionBody
if ($LASTEXITCODE -ne 0) { throw 'GitHub no ha activado la proteccion. Revisar el error, permisos y plan del repositorio privado.' }
gh api ('repos/' + $protectionRepo + '/branches/main/protection') --jq '{checks: .required_status_checks.contexts, strict: .required_status_checks.strict, enforceAdmins: .enforce_admins.enabled, forcePushes: .allow_force_pushes.enabled, deletions: .allow_deletions.enabled}'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar la configuracion final.' }
