# Independent v 2 arithmetic audit

For a standalone replay, place `verify_transfer_v2.py` beside the published study inputs and run:

```text
python -I -X utf8 verify_transfer_v2.py
```

Alternatively use `--study-dir` with a relative directory. The verifier uses the standard library and never imports or executes either `amylose_transfer.py` or `model.py`. It independently derives the joint fit in closed form, the power fit, exact Bornet regression, empirical scores, errors, coefficient thresholds, normal/delta correlation sensitivities, and dose-only support comparisons. It emits `transfer_v2_verification.json` and stdout.

323 numeric/boolean checks passed against the corrected v 2 result. Joint theta 0.2593743409797513, kernel donor 0.16666666666666663, flour donor 0.36204146730462494, power 0.6402334327027194, exact Bornet heatedb 1.7282696920791498. The independent closed-form joint fit differs from the iterative result by 1.15 e−9, without substantive effect.

Exact central primary signed 120 mean absolute log errors: derived non-RS dose.06965868654112554; totalstarch.21722934436718366; jointtheta×non-RS.5526434747218145; jointtheta×total.38620059859123923; power×non-RS.6433817323516784; power×total.4769388562211031; flourtheta×non-RS.42548914287983214; equality.47350361947058034; exact Bornet 1.656633845215606. Thus the flour-donor sensitivity beats equality while all specified empirical amylose multipliers remain worse than the non-RS dose comparator on this primary metric.

The two relevant reading disagreements remain explicit:

|Model/basis|Refined prediction|Wholemeal prediction|Conditional result|
|---|---:|---:|---|
|Jointtheta×non-RS|.374051515505|.343374895354|Refined above Sol lower.3736559 by+.00105821 log but below coordinator lower.38209983; wholemeal below both reading lower bounds|
|Jointtheta×total|.442828844869|.404608033984|Refined inside no-reading/reading bounds; wholemeal below no-reading lower but inside both reading conventions|
|Kerneltheta×total|.385431463068|.352164653036|Refined above BOTH coordinator and Sol reading lowers, below no-reading lower; wholemeal below all|

Available-basis theta admissibility thresholds: refined.345355726(no-reading),.275265533(coordinator reading),.258596991(Sol lower). Wholemeal.422743018,.335253225,.340382205 respectively. Consequently the jointtheta.259374341 lies just above Sol's refined threshold but below both wholemeal reading thresholds. Total-basis thresholds are also reproduced in JSON. All are necessary model-admission diagnostics under the published sample/grid/reading assumptions, not population limits or nutrient-potency estimates. The script labels Sol's value as a lower-limit check rather than a complete independently supplied interval.

Source/interpretation corrections accepted by the coordinator remain necessary: use empirical feature language, do not equate total-starchA with remaining-pool amylose, qualify rather than assert donor/target dose-basis equivalence, distinguish wheat from durum in Hoebler, and limit conclusions to the candidates and endpoints checked. Heated Bornet predicts the observed direction of reduction but excessive magnitude; wrong-direction applies to the earlier shared-state exponent. No blanket prohibition on stacking scientific features or proof that every transferable coefficient is impossible follows from these data. Approximate 1.96 delta/log-SE bands are sensitivity calculations, not identified sets or exact confidence intervals.

Numerics of Hoebler dose-only baselines and Costabile equality baselines are independently reproduced; coverage/abstention is appropriate in v 2. No prior source extraction or wheat/flake test was rerun. No INSIGHT code, scientific behavior, secrets, participant records or Git actions were involved.

The JSON records exactSHA256 of source, result and memo at execution. The coordinator is editing the public wording without changing numbers and will regenerate the public verification against the final edited files. This receipt’s run is tied to source`ed1df6d96c81df9b40936781a9698cb79ca296aea95209954dacc8767f2a0118` and result`52d917cfca047e729082d8bf2cadaa69e396292ddb1d1105672cbc7bd46378f8`; wording edits require a new source hash even if numeric comparisons remain identical.

The public replay is now complete. Run `python -B reproduce.py` from the study directory for the read-only replay. The final source, memo and result hashes appear in [transfer_v2_verification.json](transfer_v2_verification.json). All 323 checks also passed after the coordinator’s wording corrections.
