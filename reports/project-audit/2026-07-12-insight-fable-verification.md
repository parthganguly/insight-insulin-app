# INSIGHT — Fable-Only Certification & Verification Appendix (Replacement Pass)

Companion to `2026-07-12-insight-comprehensive-audit.md`. This file **replaces** an
earlier verification appendix that was invalidated (see §0). It records an independent
re-verification of every load-bearing conclusion in the comprehensive audit, performed
in a single uninterrupted Fable session.

---

## 0. Integrity disclosure — why this is a replacement

An earlier certification attempt on this audit is **void**. During that attempt the
active model switched from **Fable to Opus 4.8** while verifying external scientific
sources, and work (report edits + a verification appendix) continued after the switch.
Because a certification that another model participated in cannot be presented as
Fable-certified, that appendix and the certification banner it added to the main report
were **marked invalid** at the start of this pass and are superseded by the content
below.

This replacement pass was performed from a **fresh, uninterrupted Fable 5 session**.
Every result below was reproduced from the repository or primary sources in *this*
session — not copied from the prior (tainted) transcript. Notably, this pass found a
numerical error that the tainted pass had asserted as "reproduced exactly" (the Veggie
Omelette demo score; see §5 and §6), which is exactly the kind of defect an independent
re-run is meant to catch.

## 1. Model-integrity statement

This entire replacement pass — preflight, re-derivations, primary-source verification,
report corrections, and this appendix — was performed by the primary **Fable 5** model
(`claude-fable-5`) in the primary context, with **no model switch** and **no subagents**.
Had the model changed away from Fable at any point, the pass would have halted and
returned the required sentinel instead of continuing.

## 2. Audited commit

- Commit: **`ab9ab3729739ce274d053ebaac36dd66dc73ac7b`** (`ab9ab37`), branch `main`.
- Preflight (this session): `git switch main` → already on main; `git pull --ff-only origin main` → "Already up to date."; `git log -1 --oneline` → `ab9ab37`; `git status --short` → only `?? reports/`; `git diff --check` → clean.
- **PR #90:** MERGED 2026-07-11T19:42:18Z. **Open PRs:** none. HEAD equals the audited commit; no later `main` commit; no active implementation PR makes the audit stale. No application file changed.

## 3. Verification method

- **Re-derived all scoring numbers** in this session with a read-only script that imports the backend modules and calls the pure functions (no DB writes, no network): 600 kcal rice, all six demo-seed meals (item load, share, source, meal acute, meal quality), mixed-dish decomposition, and the chronic 7-day rolling metric under three logging patterns.
- **Pinned the exact displayed acute score** for the disputed meal by calling the real `compute_insulin_load_item`/`compute_acute_score` and applying the frontend's `Math.round` (`frontend/src/utils.ts:9`).
- **Re-ran the load-bearing checks** in this session: backend `unittest` (OK), `run_validation` (6/6), golden-fixture `--check` (current), `cargo test --workspace` (160 + 44 pass). Re-confirmed the CI gap statically from `.github/workflows/ci.yml`.
- **Re-verified the external Bao citation** via independent web search against the primary journal, distinguishing the 2009 composite-meal paper from the 2011 dietary-index paper.
- **Read the load-bearing source directly**: `scoring_service.py`, `fii_lookup.py`, `food_normalizer.py`, `estimate_quality.py`, `chronic_service.py`, `api/meals.py`, `main.py`, `ci.yml`, `docs/scientific-model.md`, and the relevant frontend files.

## 4. Claim-by-claim verification table

| # | § | Claim | Classification | Evidence (this session) | Confidence |
|---|---|---|---|---|---|
| 1 | §10 | 600 kcal rice scores 1580 | FABLE VERIFIED | Re-derived IL=474.0 → acute 1580.0 | high |
| 2 | §1,§10 | Six demo meals **display** 39, 106, **189**, 375, 551, 829 | CORRECTED | Report said 190 for Veggie Omelette; real acute = 189.4999… → `Math.round` = **189** (`utils.ts:9`). Other five reproduced exactly. | high |
| 3 | §10 | Reference constant 30.0 flagged `# TODO: Calibrate` | FABLE VERIFIED | `scoring_service.py:9-10` | high |
| 4 | §10 | "100 ≈ typical meal" false; needs IL=30 (~38 kcal rice) | FABLE VERIFIED | `compute_acute_score(30)=100`; 30/0.79=37.97 kcal; claim at `docs/scientific-model.md:36` | high |
| 5 | §10 | Green (<35) unreached; one amber (Grilled Chicken Salad 38.8); rest red | FABLE VERIFIED | Re-derived tier map: 1 amber, 5 red, 0 green | high |
| 6 | §10,§13 | FII dataset = 10 rows, all `starter_placeholder` | FABLE VERIFIED | Read `fii_foods.csv` (10 rows, every source `starter_placeholder`) | high |
| 7 | §10 | Decomposition silently drops CSV-absent components (biryani → 0.60 rice only; rice-and-chicken → 0.65 rice) yet labels `mapped_fii` | FABLE VERIFIED | Re-derived: biryani@600 IL=284.4 matched=1 share=0.60; rice-and-chicken IL=308.1 matched=1 share=0.65; chicken/oil→None | high |
| 8 | §10 | Worst-of-N quality; **4 meals** poisoned-staple, **2 meals** all-`macro_fallback` | FABLE VERIFIED | Re-derived: eggs 98.2% exact, plain yogurt 96.1% exact, white rice 95.3% exact, whole wheat bread 96.7% mapped (each + one macro_fallback side); Grilled Chicken Salad & Pasta+Cake both all-macro_fallback | high |
| 9 | §10 | Load-weighted quality as the fix | FABLE VERIFIED WITH QUALIFICATION | Correct for the 4 poisoned-staple meals; would **not** rescue the 2 all-fallback meals. Retained in report as an unvalidated *proposal* ("should it be weighted…?"), not a validated solution. | high |
| 10 | §10 | Chronic metric rewards under-logging (zero-filled unlogged days) | FABLE VERIFIED | `main.py:96-99` zero-fills; re-derived exact 7:1 reduction across 3 diets (e.g. 57→8, 21→3, 18→3); 4/7 ≈ 4/7 of full | high |
| 11 | §10 | Specific "79 (daily) vs 11 (sporadic)" pair | FABLE VERIFIED WITH QUALIFICATION | Mechanism + 7:1 ratio reproduced; 79/7≈11 is internally consistent; exact 0.79-DII diet not pinned in the report, so I reproduced the mechanism on other diets rather than that exact pair | moderate |
| 12 | §2,§18 | Backend 24 unit OK; validation 6/6; golden fixtures current; Rust 160+44 pass | FABLE VERIFIED | Re-ran all four in this session | high |
| 13 | §18 | CI omits `backend/tests/*` (incl. `test_ai_fii_trust_boundary.py`, `test_no_image_retention.py`) and omits `npm run lint` | FABLE VERIFIED | `ci.yml` backend runs only compileall + run_validation + fixture check; both test files exist under `backend/tests/`; frontend runs tsc + test.unit + build (no lint) | high |
| 14 | §11,§36 | Holt 1997 original FII: AJCN 66:1264-1276, 38 foods, ~11-13 subjects, white bread=100 | FABLE VERIFIED | Independent search: title, journal, volume, pages, design all confirmed | high |
| 15 | §11,§36 | Bao composite-meal paper year/volume/pages | CORRECTED | Independent search: **2009; AJCN 90:986-992**, authors Bao/de Jong/Atkinson/Petocz/Brand-Miller; 13 mixed meals n≈10-11. Prior draft's 2011 was wrong; 2011 = distinct paper (PMID 21543531). Correction re-verified this session. | high |
| 16 | §11 | r = 0.78 (FII-predicted vs observed); observed 3-fold range | FABLE VERIFIED | Search-confirmed r=0.78, P=0.0016; observed 35→116 (3-fold) | high |
| 17 | §11 | "Predicted 5-fold spread" exceeds observed | EXTERNAL VALIDATION REQUIRED | Not confirmable from primary source this pass (AJCN full text 403 to automated fetch); observed 3-fold confirmed, over-prediction *direction* is the paper's conclusion. Report now flags the 5-fold figure as unconfirmed. | moderate |
| 18 | §17 | FDA SaMD / GDPR Art. 9 / US state health-data laws as gating items | FABLE VERIFIED WITH QUALIFICATION | Retained as general, jurisdiction-dependent planning pointers; report now explicitly states these are not a settled legal classification and **not legal advice** | n/a (planning) |

## 5. Reproduced numerical results (this session)

**600 kcal plain rice** (FII 79): IL 474.0 → acute **1580.0**.

**Six demo-seed meals** (scored through the live pipeline; "Display" = `Math.round(acute)`):

| Meal | Total IL | Acute (raw) | **Display** | Tier | Quality | Dominant item (share, source) |
|---|---|---|---|---|---|---|
| Grilled Chicken Salad | 11.64 | 38.80 | **39** | amber | low | chicken 90.2% `macro_fallback` — **all items fallback** |
| Pasta with Cake Dessert | 31.78 | 105.92 | **106** | red | low | cake 50.9% `macro_fallback` — **all items fallback** |
| Veggie Omelette | 56.85 | 189.4999… | **189** | red | low | eggs 98.2% `exact_fii` |
| Yogurt Berry Bowl | 112.38 | 374.60 | **375** | red | low | plain yogurt 96.1% `exact_fii` |
| Turkey Sandwich | 165.40 | 551.33 | **551** | red | low | whole wheat bread 96.7% `mapped_fii` |
| Rice Plate with Sweet Drink | 248.70 | 829.00 | **829** | red | low | white rice 95.3% `exact_fii` |

Tiers (35/60): 1 amber, 5 red, **0 green**. **The Veggie Omelette display is 189, not 190** — the raw acute is 189.4999999999999... (just below the half), so both JS `Math.round` and Python `round` yield 189.

**Mixed-dish decomposition** (@600 kcal): biryani IL 284.4 (matched 1, share 0.60), rice-and-chicken IL 308.1 (matched 1, share 0.65), dal rice IL 417.3 (matched 2, share 1.00), steak-and-potatoes IL 474.0 (2, 1.00), egg-and-toast IL 434.4 (2, 1.00), milk-and-oats IL 273.6 (2, 1.00), chicken curry IL 0.0 (0, unknown). Biryani/rice-and-chicken confirm the silent downward bias with a `mapped_fii` label that does not disclose the dropped mass.

**Chronic metric** (rolling-7d DII × 100), identical diet under three logging patterns:

| Diet (daily DII) | logged 7/7 | logged 1/7 | logged 4/7 |
|---|---|---|---|
| arch1 (0.2128) | 21 | 3 | 12 |
| arch2 (0.5661) | 57 | 8 | 32 |
| arch3 (0.1755) | 18 | 3 | 10 |

Every case reproduces the 1/7 reduction when the same food is logged on 1 of 7 days — the metric rewards under-logging.

## 6. Corrections made to the main report in this pass

1. **Demo score 190 → 189** (§1 line 151, §10 line 162). The Veggie Omelette displays as 189 (`Math.round(189.4999…)`). This is a **new** correction; the invalidated pass had asserted "190 … reproduced exactly."
2. **`docs/scientific-model.md` citation :37 → :36** (§10, §12) — the "typical mixed meal" claim is on line 36.
3. **Bao citation** — retained the year correction to **2009;90:986-992**, independently re-verified this session; softened the roadmap's "Bao 2011-style datasets" to "Bao 2009-style" (§30 item 3) and flagged the "predicted 5-fold" figure as unconfirmed there too.
4. **§10 demo-meal quality mechanism** — retained the refinement distinguishing the 4 poisoned-staple meals from the 2 genuinely all-fallback meals, re-verified by execution this session.
5. **Regulatory §17** — added an explicit statement that the FDA/GDPR/state-law items are general, jurisdiction-dependent planning pointers, not a settled legal classification, and that the audit is **not legal advice**.
6. **Invalidation notices** — replaced the false Fable-certification banner (main report) and the void model-integrity statement (this appendix) with in-progress/void markers, now superseded by this certified content.

## 7. Claims downgraded, corrected, or removed

- **Veggie Omelette "190":** CORRECTED to 189.
- **Bao "2011":** CORRECTED to 2009;90:986-992.
- **Bao "predicted 5-fold spread":** DOWNGRADED to EXTERNAL VALIDATION REQUIRED (unconfirmed from primary source; direction retained).
- **"Every demo meal is low due to worst-of-N" (universal reading):** DOWNGRADED to "4 of 6 are worst-of-N; 2 of 6 are genuinely all-fallback."
- **False Fable-certification language (both files):** REMOVED and replaced.
- No strategic conclusion was removed. The audit's load-bearing findings — uncalibrated acute score with a `TODO` reference, chronic under-logging artifact, 10-row placeholder dataset, decomposition drop-bias, worst-of-N quality rule, CI safety/privacy gap, and a well-built but unconsumed Rust core — **all survived independent re-verification**.

## 8. External-source verification table

| Source | Year | Journal / ID | Design / population | Result used | Represented accurately? |
|---|---|---|---|---|---|
| Holt, Brand-Miller, Petocz — *An insulin index of foods* | 1997 | Am J Clin Nutr 66:1264-1276 | 38 foods, 11-13 healthy subjects, 1000 kJ portions, white bread=100 | Concept: insulin response per iso-energetic portion | **Yes** |
| Bao, de Jong, Atkinson, Petocz, Brand-Miller — *Food insulin index: physiologic basis…composite meals* | **2009** | Am J Clin Nutr 90:986-992 | 13 mixed meals (2000 kJ), n≈10-11/meal, healthy | r=0.78 (P=0.0016); observed 3-fold (35→116); fat inversely related | Yes (year **corrected** from 2011); "5-fold predicted" unconfirmed |
| Bao et al. — *Dietary insulin index and insulin load…biomarkers* (the paper the draft confused) | 2011 | Am J Clin Nutr; PMID 21543531 | Distinct observational paper | — | Clarified as a different paper |
| Later T2D/lean FII crossover extensions | various | — | Small-N, acute | Directional support | EXTERNAL VALIDATION REQUIRED (retained as such) |

## 9. Remaining uncertainties

- **Bao "predicted 5-fold spread":** unconfirmed from the primary PDF (AJCN returned HTTP 403 to automated fetch); r and observed 3-fold range are confirmed. Verify against the paper's figures before any external claim.
- **Chronic "79 vs 11" pair:** mechanism and 7:1 ratio fully reproduced; the exact pair depends on an unspecified higher-DII diet and is self-consistent. Not material to the conclusion.
- **Later T2D/lean FII citations:** accepted as directional, not individually read; flagged EXTERNAL VALIDATION REQUIRED.
- **Regulatory framing:** deliberately left as jurisdiction-dependent planning pointers; not legal advice.
- **Frontend runtime E2E:** not exercised this session (the Cypress starter is broken boilerplate); frontend behaviour is inferred from source + the passing unit suite + PR #90's code, as the audit itself states.

## 10. Final certification verdict

**FABLE-CERTIFIED WITH QUALIFICATIONS.**

Every load-bearing conclusion in the comprehensive audit was independently re-derived or
appropriately qualified during this single uninterrupted Fable session. The audit's
central findings all survived. The qualifications are: one external citation was
mis-dated and one demo score was wrong (both now corrected); one external figure (Bao's
"predicted 5-fold spread") remains unconfirmed against its primary source and is flagged
EXTERNAL VALIDATION REQUIRED; the "79 vs 11" chronic figures are verified at the
mechanism level but depend on an unspecified diet; and several scientific/regulatory
statements are inherently external and are gated behind EXTERNAL VALIDATION REQUIRED or
labelled as non-legal planning pointers. Full unqualified `FABLE-CERTIFIED` is withheld
solely because of those remaining external, not-yet-primary-source-confirmed items — the
repository-level engineering and scoring conclusions are certified without reservation.

---

**Model-integrity confirmation:** This replacement certification pass — preflight,
re-derivations, primary-source verification, corrections, and this appendix — was
performed end-to-end by the primary Fable 5 model with no model switch and no subagents.
The earlier pass, which a model switch to Opus 4.8 had tainted, is explicitly
invalidated and superseded by this document. No application code, dataset, formula,
configuration, branch, issue, or PR was modified; only the two report files under
`reports/project-audit/` were written, and both are left uncommitted.
