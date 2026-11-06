$ErrorActionPreference = 'Stop'
$apkProjectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'use-android-tools.ps1')
Set-Location -LiteralPath $apkProjectRoot
# Windows PowerShell 5 reports native warnings on stderr as errors; use exit codes.
$ErrorActionPreference = 'Continue'
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw 'Web validation failed.' }
npm.cmd run format:check
if ($LASTEXITCODE -ne 0) { throw 'Formatting validation failed.' }
npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
& (Join-Path $apkProjectRoot 'android\gradlew.bat') --project-dir android --no-daemon --max-workers=2 :app:lintRelease :app:assembleRelease :app:assembleDebugAndroidTest
if ($LASTEXITCODE -ne 0) { throw 'Native Android validation or build failed.' }
node (Join-Path $PSScriptRoot 'sign-android.mjs')
if ($LASTEXITCODE -ne 0) { throw 'APK signing or verification failed.' }
