# Offline independent checks

Run from the packet root with Python3 standard library only (no network, packages, or private paths):

```
python -B sol/verify.py
python -B sol/mixed_check.py
python -B sol/moro_check.py
python -B sol/positive_check.py
```

Each locates the packet relative to its own file. mixed_check independently recalculates and asserts current mixed/results.json and mixed/challenge.json coefficients, predictions, errors, profile selections, all permutations, common-response control, Oxford outputs and structural bound. Other scripts independently recalculate Acheson/Power ratios and Moro signed/positive bounds from extracted aggregate inputs, writing aggregate receipts or printing results. Source XML/PDF/images are not needed. The original Oxford XML acquisition is an optional source audit retained locally, not part of the replay or safe packet.

Precise sol/allowlist for safe Git and ZIP (same list):
- README.md
- REVIEW.md
- EVIDENCE.md
- verify.py
- independent_results.json
- mixed_check.py
- mixed_check.json
- moro_check.py
- moro_check.json
- positive_check.py

Exclude sol/Thondre-original.xml, sol/raw/, sol/challenge_snapshot.json and any generated source/media or bytecode. Historical absolute-path checkers are retained locally under sol/raw/historical/. The replay additionally requires the public aggregate input/output directories mixed/, public/readings.json, and morifuji/figure.json. For precise external dependencies inspect the scripts; no raw source file is loaded.

Completed: all four invocations pass. The mixed checker verifies actual current outputs, including the Oxford four levels and all four contrasts, rather than a copied snapshot. Original Oxford Table1/4 manually checked against independently fetched original JATS. Power v2 numeric outputs cross-checked; coordinator owns correction of stale narrative/abstention JSON. No product/scientific scoring code changed.
