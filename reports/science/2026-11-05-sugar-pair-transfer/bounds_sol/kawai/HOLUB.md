# Independent Holub per-window check on Kawai

Reconstructed the prespecified Holub comparator directly from
`public/prior/holub.csv`, using signed trapezoids, each sugar's own fasting
baseline, and all observed nodes through 60/120 minutes. No Kawai values enter
those forecasts. This checks the frozen comparator's arithmetic and scoring;
it does not independently redigitize Holub's original source.

| Holub quantity | 60 minutes | 120 minutes |
|---|---:|---:|
| Isomaltulose signed area (pmol min/L) | 7830.630968 | 15200.069620 |
| Sucrose signed area (pmol min/L) | 15845.389272 | 23214.316981 |
| I/S forecast | **.494189876565** | **.654771347866** |

The resulting 60-to-120 fold is **1.324938811813**. The independently read
Kawai outcomes are I/S=.390216931117 and .459470470364, fold **1.177474460294**.

| Forecast | Level MALE across 60/120 | Shape absolute log error |
|---|---:|---:|
| Holub per-window | .29521420 | **.11799442** |
| Frozen Maastricht trajectory | **.14682457** | .17192778 |
| Constant equality at level / no change in shape | .85936653 | .16337186 |

Maastricht wins level forecasting over Holub, including the full +/-10-pixel
Kawai reading range. The per-window tie thresholds are geometric means of
their two forecasts: .45270543 (60) and .61620186 (120). The complete Kawai
ratio ranges stay below both thresholds (their maxima at +/-10 pixels are
.43828345 and .51902042). This is a per-window proof and therefore also
proves the ordering under the equal-weight mean absolute log loss.

Holub wins **shape** over Maastricht robustly: their geometric tie threshold
is **1.36115412**, above the entire Kawai fold range even at +/-10 pixels.
Holub wins shape over no change centrally, but not uniformly over graph error:
that tie threshold is **1.15105986**, inside both reading ranges.

| Kawai graph-error case | Allowed target fold | Worst log loss: Holub | Maastricht | No change |
|---|---:|---:|---:|---:|
| +/-5 original pixels plus scan-slope range | 1.143134-1.214383 | **.14759303** | .20152639 | .19423608 |
| +/-10 original pixels plus scan-slope range | 1.117259-1.247191 | **.17048798** | .22442134 | .22089345 |

Thus Holub is the **minimax choice among these three fixed shape candidates**
over either declared graph-error interval. That is different from claiming a
pointwise robust win over no change. For any positive target interval [L,U],
the worst absolute log loss of candidate p is

    W(p) = .5*log(U/L) + abs(log(p/sqrt(L*U))).

The interval's target-informed minimax center sqrt(L*U) is 1.17821981 at
+/-5 pixels and 1.18043838 at +/-10, with optimal radii .03023142 and .05500758.
Both centers exceed the Holub/no-change tie threshold 1.15105986 and lie below
the Holub/Maastricht threshold 1.36115412. These oracle centers use Kawai
outcomes and reading bounds; they are diagnostics, not additional forecasts.

All reading bounds and qualifications are inherited from this directory's
independent `REPORT.md`: observed 0,15,30,60,90,120-minute signed sample-mean
curves, n=8 fasting nominal 50 g, no 180-minute outcome, no participant-positive
identification or population confidence interval. The Holub CSV is an exposed
development feature, while Kawai is the separate evaluation cohort. Neither
level and shape losses nor separate cohorts were pooled to select a clock.

Reproduce with `python holub_comparison.py`; output is `holub_results.json`.
The original .654771347866157 scalar was reproduced to 1e-12. Python
compilation and the displayed minimax identity passed. Source CSV SHA256:
`6124cb583fe8791337fe32114e596508cf8da100c06f1ffc6702a33384a39d0c`.
No shared repository or branch files were edited.
