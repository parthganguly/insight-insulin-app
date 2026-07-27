# Campaign A — Native Android QA Evidence Manifest

- **Date curated:** 2026-07-17
- **Curator:** Claude Code (Fable 5), single agent
- **Purpose:** keep the minimum evidence set in Git that proves the native QA
  outcome; retain everything else locally, outside version control, to avoid
  repository bloat.

## Retained in Git (this directory)

| File | Size | Why retained |
|---|---|---|
| `native-qa.md` | ~9 KB | The QA report itself: device, build, journeys, results, findings, cleanup status. |
| `logcat-filtered-excerpts.txt` | ~2 KB | Proves zero FATAL EXCEPTION / ANR for the app process and lists the only app-process errors seen (all benign/expected). No personal data, tokens, or payloads. |
| `screenshots/06-home-first-launch.png` | 244 KB | Home renders on first cold launch; insets and bottom tabs correct. |
| `screenshots/07b-scroll-with-keyboard.png` | 116 KB | Keyboard editing: field visible, scroll works with keyboard open. |
| `screenshots/07c-back-dialog.png` | 240 KB | Dirty-draft guard: explicit "Discard this draft?" confirmation on hardware Back. |
| `screenshots/07d-resume-dirty-draft.png` | 208 KB | Background/resume: dirty 3-item draft fully intact after backgrounding. |
| `screenshots/07e-canonical-result.png` | 272 KB | Canonical saved-meal result with cautious scientific language. |
| `screenshots/07e-history-readonly.png` | 280 KB | History detail is read-only (Done / Check another / Delete only). |
| `screenshots/07e-reuse-draft.png` | 188 KB | Previous-meal reuse creates a fresh editable draft ("not saved yet"). |
| `screenshots/07f-two-photos.png` | 464 KB | Camera flow with two attached photos (thumbnails render). |
| `screenshots/07g-landscape.png` | 172 KB | Rotation: landscape layout correct, state kept. |

Curated screenshot total: 9 files, ~2.1 MB.

## Excluded from Git (retained locally)

Local archive:
`../insight-insulin-app-qa-archive/campaign-a-android-native/` (sibling of the
repository working directory; not under version control).

| Item | Size | Why excluded |
|---|---|---|
| 32 additional screenshots | ~10 MB | Redundant with the curated set: intermediate keyboard states, per-step navigation shots, dialog Stay/Discard permutations, extra camera/rotation angles. Each journey they document is already represented by a curated screenshot plus the report's results table. |
| `qa-native-journey.mp4` (screen recording of the save journey) | 2.65 MB | Video adds permanent Git history weight and duplicates what `07e-canonical-result.png` plus the backend access-log observation (exactly one `POST /meals`) already prove. **Recommendation: exclude from Git and retain locally**; it is small enough (<10 MB) to attach to the documentation PR or an issue via the GitHub web UI if a reviewer wants motion evidence. |

## Not retained anywhere (never existed in the repo, or deleted during QA)

- Raw ~260k-line logcat capture — filtered excerpts kept instead.
- Device temp recording `/data/local/tmp/qa-native-journey.mp4` — deleted from
  the device during QA cleanup.
- Temporary screenshots taken during the post-QA synthetic-meal deletion
  session — kept only in the session scratchpad, not in the repo.

## Privacy note

All screenshots show only synthetic QA data (`QA Synthetic lentil rice bowl`,
`Demo: …` seed meals) and the device status bar. The only device identifier in
the retained evidence is the serial already recorded in `native-qa.md`'s device
table, which is required to identify the authorized test device. No personal
meals, photos, credentials, or tokens appear anywhere in the retained set.
