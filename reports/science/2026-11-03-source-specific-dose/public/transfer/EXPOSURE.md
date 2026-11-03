# Exposure and stage record

| Stage | What was read or done | Outcome exposure |
|---|---|---|
| Before task | Training (AJCN 2000) resting outcomes: my own earlier readings and text anchors | Fully exposed |
| Intake | `prior.md`, `graded_prompt.md` | Prior results; no target numbers |
| Pre-freeze | Target abstract, introduction, Subjects and Methods (PDF text to the "RESULTS" heading) | Abstract: only the Leu+Phe+wheat drinks increased insulin, +52% (0.2) and +107% (0.4), and doubling raised it further |
| Pre-freeze fix | Beverage-5 nitrogen-source sum corrected in `predict.py`; first `PREDICTIONS.json` deleted and regenerated | None (no results read) |
| Freeze | `FREEZE_RECEIPT.json` 2026-11-03T11:01:41Z: PLAN, predict, PREDICTIONS, score, training outcomes | — |
| Post-freeze | Results text; Fig. 2 and Fig. 3 extracted from the PDF and digitized (single reader, `digitize_target.py`); target snapshot `target_data_opus.json` | All target outcomes |

- **Declared before scoring:** the curve-reading half-width (±10 pmol/L primary, ±15 sensitivity) and the bar half-width (±0.5).
- **Pairings:** W1 ↔ 0–120 total training references, and W2 ↔ second-hour training reference, were frozen in PLAN.
- **Independence:** Astra's independent target extraction had not been seen when these readings were made. Coordinator data can be scored with the same `score.py` without changes.
- **Raw files:** figure images and the PDF stay in `raw/` and are not part of the curated output.
