@AGENTS.md

# Gemini Code Assist Instructions

## Authority

- Read and obey `AGENTS.md` before planning, reviewing, or changing code.
- For migration work, read only the relevant scientific and architectural documents for the task.
- `docs/target-architecture.md` governs the approved target architecture.
- Existing Ionic React/Capacitor code is the behavioural reference during migration, not the final target architecture.

## Intended Gemini role

Gemini is primarily the Android specialist for this repository.

Use Gemini for:

- Android Studio setup and project configuration
- Kotlin and Jetpack Compose implementation details
- Gradle configuration and build failures
- Android emulator and device issues
- Logcat analysis
- Android permissions
- Camera and media APIs
- Android Keystore integration
- Health Connect integration
- accessibility and UI behaviour checks
- Compose previews and Android-specific tests

Do not use Gemini as the authority for:

- scientific scoring formulas
- FII mappings or fallback logic
- acute-score, DIL, DII, rolling-trend, threshold, or confidence semantics
- consent policy
- research-data collection or model-training data policy
- encryption policy or cryptographic design
- overall architecture replacement

## Architecture boundaries

The approved target Android direction is:

- Android: Kotlin + Jetpack Compose
- shared scientific/domain core: Rust
- language bindings: UniFFI
- local database: SQLite with SQLCipher or equivalent encryption
- key protection: Android Keystore
- AI recognition: provider-neutral meal draft generation
- scoring: deterministic Rust core, not UI code

Do not independently replace this with Flutter, React Native, Firebase, Supabase, Kotlin Multiplatform UI, a permanent WebView-first architecture, or a total backend rewrite.

## Scientific and privacy safety

Never modify or reinterpret formulas, mappings, coefficients, thresholds, confidence semantics, datasets, or scientific claims unless the task explicitly approves a scientific change.

Never use real user health data, meal photographs, production records, credentials, signing keys, API keys, or `.env` contents in prompts, tests, logs, screenshots, or fixtures.

Use synthetic data only.

## Execution discipline

Before editing Android, persistence, permissions, Keystore, Health Connect, camera, privacy, or migration code:

1. explain the current implementation
2. state the target behaviour
3. list exact files expected to change
4. list tests or checks to run
5. call out privacy, permission, and data-retention risks

After editing:

1. list changed files
2. show relevant diff summary
3. run relevant Gradle, frontend, backend, or repository checks
4. report unresolved risks honestly

Do not commit, push, open pull requests, merge, change branches, install plugins, add MCP servers, or run external scripts unless explicitly requested.

## Android-specific guardrails

- Do not request broad Android permissions when a narrower permission or scoped API is sufficient.
- Do not add background collection of meal, image, symptom, or device data without an approved product requirement.
- Do not store meal photos, health notes, CGM data, or identifiers in logs.
- Do not add analytics events containing meal names, symptoms, notes, images, or personal health details.
- Do not duplicate the scientific scoring engine inside Compose screens.
- UI may display score outputs returned by the approved backend or Rust core, but must not become the scoring authority.

## Cost and scope discipline

- Keep changes narrow.
- Prefer read-only inspection before proposing edits.
- Do not perform broad repository rewrites.
- Do not convert the current app to native Android unless the task explicitly asks for that migration step.
