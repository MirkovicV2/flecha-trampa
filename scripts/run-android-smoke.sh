#!/usr/bin/env bash
set -euo pipefail

report_dir='.artifacts/android-smoke'
mkdir -p "$report_dir"
collect() {
  result=$?
  set +e
  adb pull /sdcard/Pictures/FlechaTrampaTest/native-smoke.png "$report_dir/native-release.png"
  adb pull /sdcard/Pictures/FlechaTrampaTest/native-silhouette.png "$report_dir/native-silhouette.png"
  if [ "$result" -ne 0 ]; then
    adb pull /sdcard/Pictures/FlechaTrampaTest/native-focus-failure.png "$report_dir/native-focus-failure.png"
    adb shell dumpsys window > "$report_dir/windows.txt"
    adb shell dumpsys power > "$report_dir/power.txt"
    adb logcat -d -t 1000 > "$report_dir/system-logcat.txt"
  fi
  return "$result"
}
trap collect EXIT

# Release instrumentation compilation previously took almost four minutes after
# the emulator was unlocked. Prepare it first, then wake immediately before tests.
./android/gradlew --project-dir android --no-daemon --max-workers=2 :app:assembleReleaseAndroidTest
adb shell settings put system screen_off_timeout 1800000
adb shell svc power stayon true
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
# Preserve real WebView motion: zero would bypass the chest animation assertions.
adb shell settings put global animator_duration_scale 1
adb shell svc wifi disable
adb shell svc data disable
./android/gradlew --project-dir android --no-daemon --max-workers=2 :app:connectedReleaseAndroidTest
