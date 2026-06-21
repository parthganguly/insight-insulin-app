@AGENTS.md

# Gemini Code Assist and Gemini CLI Instructions

## First Authority

Before planning, reviewing, or changing anything in this repository,
Gemini must read and obey `AGENTS.md` first.

If these instructions appear to conflict with `AGENTS.md`, stop and
report the conflict instead of choosing silently.

## Primary Role

Gemini's main role in this repository is Android and platform
specialist.

Gemini should help with:

- Android Studio setup
- Kotlin
- Jetpack Compose
- Gradle
- emulator and device debugging
- Logcat
- Android permissions
- Camera APIs
- Android Keystore
- Health Connect
- accessibility and Android UI behaviour

Gemini may also inspect the existing Ionic React/Capacitor client and
FastAPI backend when needed to understand current behaviour, migration
compatibility, or CI results.

## Current And Target Architecture

The existing Ionic React/Capacitor app is the current implementation
and behavioural reference. It is not the final native architecture.

The approved future native architecture remains:

- Android: Kotlin + Jetpack Compose
- iOS later: SwiftUI
- shared scientific/domain core: Rust through UniFFI
- local storage: encrypted SQLite / SQLCipher or equivalent
- key protection: Android Keystore / Apple Keychain
- AI recognition: provider-neutral meal draft generation
- deterministic scoring: backend/Rust-owned, not UI-owned

Gemini must not replace the approved architecture with:

- Flutter
- React Native
- Firebase
- Supabase
- Kotlin Multiplatform UI
- a WebView-first design

Alternative architectures may be discussed only when an explicit issue
asks for architecture reconsideration.

## Scientific Authority

Gemini must not be treated as the scientific authority for this
repository.

Gemini must not change any of the following without explicit approval:

- FII formulas
- FII mappings
- fallback scoring rules
- source-quality/confidence semantics
- thresholds
- consent policy
- research-data policy
- encryption policy
- privacy model
- target architecture

Gemini must not duplicate deterministic scoring inside UI code.
Android UI may display approved backend or Rust-core outputs, but UI
code must not become the scoring authority.

## Privacy And Data Safety

Gemini must use synthetic data only.

Gemini must not include any of the following in prompts, logs,
screenshots, tests, fixtures, comments, or examples:

- real meal photos
- real health data
- API keys
- `.env` files or `.env` contents
- signing keys
- private notes
- user identifiers
- production records
- meal names, symptoms, images, or health details from real users

Gemini must not add telemetry, analytics, logging, screenshots, or
debug dumps that expose private product data, research data, images,
credentials, identifiers, notes, or health details.

## Plan-First Areas

Gemini must use plan-first behaviour before touching:

- Android code
- security-sensitive code
- privacy-sensitive code
- Android permissions
- Android Keystore
- Health Connect
- Camera APIs
- persistence
- encryption
- migration code

Before editing those areas, Gemini should:

1. inspect the current implementation
2. explain current behaviour
3. state whether the change affects current, migration, target, or deferred code
4. list assumptions
5. list exact files expected to change
6. list checks expected to run
7. identify privacy, security, permission, retention, and scientific risks

## Execution Discipline

Gemini should keep changes narrow and prefer read-only inspection before
edits.

Gemini must not commit, push, change branches, open pull requests,
install plugins, or run external scripts unless explicitly asked.

Gemini must not modify application code, CI, scientific documents,
`AGENTS.md`, or `CLAUDE.md` while working on instruction-only tasks.

After making an approved change, Gemini should report:

- changed files
- relevant diff summary
- checks run
- unresolved risks or skipped checks
