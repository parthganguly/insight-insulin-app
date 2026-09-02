# B2-3 device record

- Acceptance date: 2026-09-02 (Asia/Calcutta)
- Repository: `C:\Users\Parth Ganguly\Documents\Codex\2026-06-21\github-plugin-github-openai-curated-remote\work\insight-insulin-app`
- Branch: `codex/j8-unsaved-estimate-porcelain`
- Commit: `57b17cb6c9417f522e85258c5c47fefa9b6f6084`
- Pre-run worktree: clean; nothing staged
- APK: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- APK size: 9,660,383 bytes
- APK SHA-256: `FB6F9A32F924F9A13C647015FA8F634C4AC753315830D70CB3940A3CF179A061`
- Package: `io.ionic.starter`
- Installed version: `1.0` (`versionCode=1`)
- Device: Samsung SM-M356B
- Serial: `RZCY22FGP1Z`
- Android: 16
- API: 36
- Physical screen: 1080x2340
- Physical density: 450 dpi
- Density override: 420 dpi
- Initial font scale: 1.0
- Large-text acceptance scale: 1.3
- Restored font scale: 1.0
- Initial auto-rotation: enabled (`accelerometer_rotation=1`)
- Initial portrait preference: `user_rotation=0`
- Restored auto-rotation: enabled (`accelerometer_rotation=1`)
- Restored portrait preference: `user_rotation=0`; observed `ROTATION_0`

## Isolation and mutation record

- Ran the reviewed FastAPI backend unchanged from the repository against a fresh SQLite database in `C:\Users\Parth Ganguly\AppData\Local\Temp\insight-b2-3-57b17cb6-20260902`.
- Reversed only device `tcp:8000` to host `tcp:18000`.
- Replaced only `io.ionic.starter` with the exact APK and cleared only that package's app-local data.
- Entered synthetic meal data only.
- Temporarily forced rotation for landscape, then restored the original rotation settings.
- Temporarily set native font scale to 1.3, then restored it to 1.0.
- Used the debug WebView runtime to change only INSIGHT's app-local appearance preference for Paper evidence, then restored it to system-following behavior.
- No other application, account, personal file, connectivity setting, security setting, main branch, or remote was touched.

## Launch proof

- Cold launch: `LaunchState: COLD`, total time 2241 ms.
- Warm resume after ten seconds backgrounded: `LaunchState: HOT`, total time 65 ms.
- Save/background resume: `LaunchState: HOT`, total time 58 ms.
