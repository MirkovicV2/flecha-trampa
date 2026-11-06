$androidProjectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'use-local-tools.ps1')
$androidJdk = Get-ChildItem -LiteralPath (Join-Path $androidProjectRoot '.tools\jdk21') -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
if (-not $androidJdk) { throw 'Install the documented JDK 21 in .tools/jdk21 before building Android locally.' }
$env:JAVA_HOME = $androidJdk.FullName
$env:ANDROID_HOME = Join-Path $androidProjectRoot '.tools\android-sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = Join-Path $androidProjectRoot '.tools\gradle-home'
$androidCommandLineBin = Join-Path $androidProjectRoot '.tools\android-commandline\cmdline-tools\bin'
$env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + (Join-Path $env:ANDROID_HOME 'platform-tools') + ';' + $androidCommandLineBin + ';' + $env:PATH
