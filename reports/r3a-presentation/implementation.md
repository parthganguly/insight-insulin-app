# R3A local implementation record

Base and working HEAD: `e1bcfab31f0a2d09b23241e0b6b2f669603efecd`. Branch: `codex/r3a-presentation-reference-picker`. No commit, push, PR, merge, or activation.

The UI fixtures are synthetic and live in `frontend/src/components/experimentalReference/ReferenceAssessment.test.tsx` (experimental zero, unavailable null, not evaluated, evidence error, duplicate heading IDs), `ReferencePicker.test.tsx` (duplicate wording, all three eligibility states, source distinctions, clearing, zero quantity, keyboard selection), and `ReferenceCatalogStaleNotice.test.tsx` (typed stale 409, explicit fresh browse). No owner records or photographs were used.

Checks:

| Command | Result |
|---|---|
| `python -m unittest tests.test_reference_integration` from `backend/` | 20 passed |
| `python backend/build_reference_catalog.py --check` | Passed; same pinned hash, 147 records, 138/6/3 eligibility counts |
| `NODE_OPTIONS=--no-experimental-webstorage npm run test.unit -- --run` from `frontend/` | 65 files, 716 tests passed |
| `npm run test.unit -- --run src/components/experimentalReference src/api/experimentalReference.test.ts src/utils/experimentalPresentationGate.test.ts` | 5 files, 11 tests passed after review corrections |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |

Node 26's experimental global web storage breaks existing jsdom tests (`localStorage.clear` undefined) without the flag above; the complete suite passed with the flag. Existing React `act` warnings and bundle-size warnings remain. Cypress cannot reach unmounted components through production navigation, so no relevant E2E run was possible without activation.

Risk: this is user-facing scientific copy and requires independent review of the staged diff, state transitions, source projection, and accessibility before activation. The current production meal and trend presentation remains unchanged. No scientific formula, catalog value, privacy flow, provider routing, owner data, or migration changed.
