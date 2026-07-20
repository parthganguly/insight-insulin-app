# Issue #107 — Native startup visual law and safe-area architecture: implementation report

- **Branch:** `fable/native-startup-safe-area-107` (fresh worktree from `origin/main` @ `67e004f`)
- **Implementation agent:** Claude Fable 5 (sole implementer per the owner reassignment comment on issue #107)
- **Status:** implementation, automated verification, and physical-device QA complete — all blocking criteria PASS; uncommitted pending review (stop boundary)
- **Component classification (AGENTS.md):** current implementation (Ionic/Capacitor client) — startup infrastructure only. No scientific, scoring, persistence, privacy, or backend behaviour touched.

## 1. Architecture implemented

### 1.1 Startup surfaces (ratified Porcelain law)

| Layer | System light | System dark | Where |
|---|---|---|---|
| Splash (`windowSplashScreenBackground`) | `#fafaf8` | `#141619` | `values/colors.xml`, `values-night/colors.xml` (`startup_porcelain_surface`) |
| Post-splash native window (`android:windowBackground`) | `#fafaf8` | `#141619` | `values/styles.xml` (`AppTheme.NoActionBar`) |
| WebView backing | `#fafaf8` | `#141619` | `MainActivity.applyStartupSurfaces()` |
| Inline document (pre-CSS) | `#fafaf8` | `#141619` | `index.html` inline `<style>` + bootstrap script |

Every hardcoded occurrence outside `tokens.css` carries a comment naming the source token (`tokens.css` `--paper` for the paper/ink appearance). `tokens.css` itself is untouched.

### 1.2 Appearance bootstrap (before first document paint)

A synchronous inline script in `index.html` `<head>` (before bundled CSS and the module bundle) reads the actual persisted zustand payload written by `settingsStore.ts` — localStorage key `app-settings`, shape `{"state":{"darkMode":boolean|null,...},"version":n}` — and resolves the ratified tri-state:

- `darkMode === true` → ink
- `darkMode === false` → paper
- `null` / absent / corrupt / unreadable / non-boolean → follow OS (`prefers-color-scheme`)

It then applies the appearance class (`app-appearance-ink` / `app-appearance-paper`), `color-scheme`, and an inline Porcelain document background, sets `window.__APP_APPEARANCE`, and initializes `window.__APP_STARTUP_READY = false`. `main.tsx` re-affirms the same resolution (`bootstrapAppearance`) before render; `App.tsx` keeps it in sync afterwards and removes the inline background once the stylesheet owns the surface.

Removed:

- the hardcoded `ion-palette-dark` class on `<html>`;
- the `apple-mobile-web-app-status-bar-style: black` meta behaviour (now `default`);
- every startup path that could paint pure black or an incorrect white flash (the empty document is now always opaque Porcelain, with a no-JS `<style>` fallback).

### 1.3 Safe-area architecture (single source)

- `variables.css` declares the application-level source once on `:root`:
  `--app-safe-area-top/right/bottom/left: env(safe-area-inset-*, 0px)` — the browser/PWA fallback — and maps Ionic's `--ion-safe-area-*` to `var(--app-safe-area-*)` exactly once. `:root` outranks Ionic core's own `html`-level `env()` defaults, so this is the only effective writer of `--ion-safe-area-*`.
- On native, `main.tsx` (`createSafeAreaSource`) resolves the plugin insets **before** `createRoot(...).render(...)` and writes the four `--app-safe-area-*` variables on the root element. Ionic's built-in rules (`ion-header ion-toolbar:first-of-type { padding-top: var(--ion-safe-area-top) }`, tab-bar `padding-bottom: var(--ion-safe-area-bottom)`) then position the chrome correctly on the very first frame — declaratively, with no component-level JS.
- Central subscriptions: `SafeArea.addListener("safeAreaChanged")` (push), `App resume`, window `resize` and `orientationchange` (guarded requery). Every write carries a monotonically increasing token; a stale asynchronous response can never overwrite a newer rotation/resume value (pushed events always rank newest).
- The initial native inset wait is bounded (`INITIAL_INSET_TIMEOUT_MS = 3000` < native 6 s fail-open) so a hung plugin cannot block boot.

Removed (all verified by regression tests):

- hardcoded `body` `paddingTop: 50px` and the `inset-padding-top` class (`main.tsx`);
- `IonToolbarWrapper`'s `SafeArea.getSafeAreaInsets()` request and inline `paddingTop` (now a pure styling passthrough);
- `App`'s bottom-inset state, its `SafeArea` request, and the `IonTabBar` inline `paddingBottom`;
- every "start at zero, correct later" pattern.

### 1.4 Splash readiness

`MainActivity` uses the modern `androidx.core.splashscreen` contract (already a template dependency — no new dependency):

1. `installSplashScreen` + `setKeepOnScreenCondition` holds the system splash;
2. the web layer signals readiness: bootstrap appearance applied → native insets applied → React root commits (`App` fires `onShellReady` from its first effect after the initial route-shell commit) → `markShellReady` schedules a stable frame via **double `requestAnimationFrame`** → `window.__APP_STARTUP_READY = true`;
3. `MainActivity` polls `window.__APP_STARTUP_READY` every 50 ms via `evaluateJavascript` and releases the splash, applying system-bar icon contrast from the *resolved web appearance* (handles stored-preference/OS mismatches);
4. a **6-second fail-open** from activity start releases unconditionally onto the opaque Porcelain post-splash window — never black;
5. splash exit uses a single 160 ms opacity fade with `cubic-bezier(0.2, 0, 0, 1)` (tokens.css `--motion-micro`/`--motion-ease`); reduced motion (animator duration scale 0) gets an instant cut.

The existing static splash artwork (`drawable/splash.png`) is reused unchanged as `windowSplashScreenAnimatedIcon`. No new branding, artwork, or dependency.

### 1.5 Android shell

- `AppTheme.NoActionBarLaunch` (launch): `windowSplashScreenBackground` = Porcelain, `windowSplashScreenAnimatedIcon` = existing splash artwork, `postSplashScreenTheme` = `AppTheme.NoActionBar` (matching the theme `BridgeActivity` sets itself).
- `AppTheme.NoActionBar` (post-splash): explicit opaque `android:windowBackground` = Porcelain (day/night qualified colors).
- Status and navigation bars stay transparent and edge-to-edge (API 35+ enforced; pre-35 aligned explicitly). Icon contrast: paper → dark icons, ink → light icons, applied natively at startup from OS mode, re-synced from the resolved web appearance at splash release and on `uiMode` configuration changes.
- Edge-to-edge is not opted out anywhere.
- `AndroidManifest.xml` needed no change (launch theme name unchanged) — left untouched.
- `capacitor.config.ts` left untouched: a static config `backgroundColor` cannot express the OS-matched backing; `MainActivity` sets it per uiMode instead.

## 2. Exact changed files

Production:

- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/IonToolbarWrapper.tsx`
- `frontend/src/theme/variables.css`
- `frontend/android/app/src/main/res/values/styles.xml`
- `frontend/android/app/src/main/res/values/colors.xml` (new)
- `frontend/android/app/src/main/res/values-night/colors.xml` (new)
- `frontend/android/app/src/main/java/io/ionic/starter/MainActivity.java`

Authorized but intentionally unchanged: `frontend/src/theme/app.css` (no abolished mechanism had any rule there), `frontend/capacitor.config.ts`, `frontend/android/app/src/main/AndroidManifest.xml`, `values-night/styles.xml` (not required — both themes reference day/night-qualified color resources).

Tests (new/changed):

- `frontend/src/startupAppearance.test.ts` (new) — executes the real `index.html` inline script: stored true → ink before boot; stored false → paper before boot; null/absent/corrupt/non-boolean → OS; readiness flag initialized false; never pure black/white.
- `frontend/src/startupSafeArea.test.ts` (new) — persisted-payload reader; bootstrap appearance re-affirmation; centralized source writes all four variables; clamping; stale-response and out-of-order-requery guards; plugin-failure safety; bounded inset wait below the 6 s fail-open; double-rAF readiness.
- `frontend/src/startupNative.test.tsx` (new) — native path: insets resolved and applied before render; central `safeAreaChanged`/`resume` subscriptions registered.
- `frontend/src/startupPolicy.test.ts` (new) — regression guards: no `50px`/`inset-padding-top` anywhere; no safe-area plugin usage outside `main.tsx`; no inline toolbar/App inset mutation; single `--ion-safe-area-*` mapping with browser `env()` fallback; no `ion-palette-dark`; no black status-bar meta.
- `frontend/src/components/IonToolbarWrapper.test.tsx` (new) — declarative toolbar, `app-toolbar` class, no inline style.
- `frontend/src/App.test.tsx` — added shell-readiness-after-commit test.

## 3. Automated verification results

All run in the fresh worktree (`npm ci` from the committed lockfile):

| Check | Result |
|---|---|
| `npm run lint` (eslint) | PASS — no findings |
| `npx tsc --noEmit` | PASS |
| `npm run test.unit -- --run` (vitest) | PASS — 38 files, 444/444 tests (13 new startup tests) |
| `npm run build` (tsc + vite build) | PASS |
| `npx cypress run` (dev server on :5173) | PASS — 8 specs, 41/41 tests |
| `git diff --check` | PASS — no whitespace errors |
| `gradlew assembleDebug` | PASS |

Note: one unit-test store suite logs a pre-existing `ECONNREFUSED 127.0.0.1:8000` warning (backend sync attempt in jsdom); it predates this change and the suite passes.

## 4. Physical Android QA (Samsung SM-M356B, Android 16 / API 36, ADB RZCY22FGP1Z)

**Verdict: PASS — every blocking criterion met.** The uncommitted final build (instrumentation removed) was installed and verified. Evidence lives uncommitted under `reports/ux/premium-redesign/native-startup-107/evidence/` — per run: the screen recording (`<run>.mp4`), `am start -W` timing (`<run>.timing.txt`), and a `<run>/` folder with key frames (PNG) plus `metrics.json` containing per-frame mean RGB, luminance, Porcelain classification, and toolbar text-row position.

Method: `screenrecord` runs during each cold launch (`am force-stop` first); frames are decoded and measured (imageio/ffmpeg — local analysis tooling only, not a project dependency). "Black frame" = mean luminance < 8/255 from the first splash frame onward; "near-white" = mean > 240/255. The toolbar first-frame-to-settled delta is the best integer row shift correlating the toolbar-band contrast profile of the first app frame against the settled frame (contrast-independent, so the sanctioned 160 ms alpha fade cannot mask movement). The Samsung edge-panel handle strip at the right edge is excluded from band metrics.

The Settings dark-mode toggle is currently commented out in `Settings.tsx`, so the stored preference was written for the mismatch scenarios via the debug WebView's DevTools socket, using exactly the persisted `settingsStore` format (`localStorage["app-settings"] = {"state":{"darkMode":…},"version":0}`). No app code was modified for this.

### 4.1 Cold launches — 5× system light (stored pref null → paper)

| Run | `am start -W` TotalTime | Black frames | Toolbar Δ (first app frame → settled) |
|---|---|---|---|
| light_run1 | 2228 ms | 0 | 0 px |
| light_run2 | 1894 ms | 0 | 0 px |
| light_run3 | 1769 ms | 0 | 0 px |
| light_run4 | 1337 ms | 0 | 0 px |
| light_run5 | 1303 ms | 0 | 0 px |

Splash: paper Porcelain `#fafaf8`, edge-to-edge, transparent bars, dark icons, existing glyph centered. First visible app frame already fully inset (toolbar under status bar, tab bar above nav buttons) beneath the 160 ms exit fade.

### 4.2 Cold launches — 5× system dark (stored pref null → ink)

| Run | TotalTime | Black frames | Near-white frames | Toolbar Δ |
|---|---|---|---|---|
| dark_run1 | 1751 ms | 0 | 0 | 0 px |
| dark_run2 | 1277 ms | 0 | 0 | 0 px |
| dark_run3 | 1268 ms | 0 | 0 | 0 px |
| dark_run4 | 1245 ms | 0 | 0 | 0 px |
| dark_run5 | 1114 ms | 0 | 0 | 0 px |

Splash: ink Porcelain `#141619` (measured band mean ≈ (20, 21, 24)), light icons, glyph via the existing night splash asset. Zero white flashes in dark.

### 4.3 Appearance matrix (all four OS/app combinations)

| Combination | Result |
|---|---|
| OS light + paper (null) | PASS (§4.1) |
| OS dark + ink (null) | PASS (§4.2) |
| OS light + stored ink | PASS — paper splash (OS-matched), band sequence `paper → mix(160 ms fade) → ink`: exactly one appearance cut at splash exit; 0 black frames; toolbar Δ 0 px; settled status/nav icons light over ink (TotalTime 1674 ms) |
| OS dark + stored paper | PASS — ink splash, `ink → mix → paper`, one cut at splash exit; 0 black frames; 0 near-white frames before the sanctioned cut; toolbar Δ 0 px; settled icons dark over paper (TotalTime 1158 ms) |

### 4.4 System bars, rotation, resume, routes, navigation modes

- **Transparent edge-to-edge bars with correct icon contrast** — verified in every screenshot/keyframe above for both appearances, including the mismatch combinations after their cut.
- **Portrait → landscape → portrait** (`rotation.mp4`, `rotation_landscape.png`, `rotation_back_portrait.png`): chrome correctly inset in landscape (status area respected; the centered ≥768 px J1 demo frame is by design), returns to an identical settled portrait layout; no stale-inset overwrite observed (centralized token guard).
- **Background/resume** (`resume.mp4`): zero black frames; correct insets on the resumed first frame.
- **Settings route** (`settings_route.mp4/.png`): obeys the same first-frame law — header divider edge at row 246 on both Home and Settings settled frames (identical toolbar geometry; the 4 px text-row difference between titles is letterform height, not displacement).
- **Gesture navigation** (`gesture_nav_launch.mp4`, `gesture_nav_settled.png`): cold launch under gesture nav — 0 black frames, toolbar Δ 0 px, tab bar clear of the gesture pill on its first frame. Three-button mode restored afterwards (`navigation_mode` back to 0).

### 4.5 Fail-open probe

With temporary instrumentation (readiness probe pointed at a flag the web layer never sets, plus two `Log.i` timing anchors), the splash was held and released by the fail-open alone:

- logcat: `activity onCreate` 01:27:52.483 → `splash released` 01:27:58.496 = **6.013 s** (bound: 6 s + one 50 ms poll granularity).
- `failopen_probe.mp4`: the entire hold is ink Porcelain (mid-hold frame mean ≈ (19.5, 21.0, 23.4) ≈ `#141619`), release lands on the rendered app — **never black** (0 black frames).
- All instrumentation was then removed (verified `grep` clean), the production APK rebuilt and reinstalled, and final cold launches re-verified in both modes (§4.6).

### 4.6 Final clean-build verification (instrumentation removed)

| Run | TotalTime | Black frames | Near-white (dark) | Toolbar Δ |
|---|---|---|---|---|
| final_light | 1957 ms | 0 | n/a | 0 px |
| final_dark | 1814 ms | 0 | 0 | 0 px |

Device left in its default state: OS light, three-button navigation, stay-awake off, app data cleared (stored preference null).

## 5. Unresolved risks

- Navigation-bar icon contrast on a *mid-session manual* appearance toggle (Settings) is not updated at runtime (the status bar is, via `@capacitor/status-bar`; no plugin surface exists for nav-bar icons without a new native file, which is outside the authorized boundary). Launch-time contrast is correct for all four OS/app combinations, including mismatches; the next launch is always correct. Pre-existing limitation, now narrower than before.
- The `evaluateJavascript` readiness poll depends on the WebView executing the inline bootstrap; if the web bundle fails entirely, the 6 s fail-open releases onto the Porcelain post-splash window (verified by the fail-open probe below).
