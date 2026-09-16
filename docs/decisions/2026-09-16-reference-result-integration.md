# Experimental attached reference assessment

Status: locally implemented for review; not activated or accepted for production.

The owner-authorized `CODEX_R2_REFERENCE_INTEGRATION.md` scopes a Python/FastAPI
experimental migration component. The Rust/native target remains unchanged.
The accepted Bao reproduction and Bell/Caferoglu review motivate investigation
of explicit measured references; they do not validate this application's full
pipeline. No new literature, fitting, calibration or source corrections are used.

The exception to legacy scoring is separately identified as
`experimental_reference_load_v1`: for an eligible selected glucose-reference
record, `(FII_mean / 100) * quantity * reviewed_kcal_per_unit`. Sum only when
every consumed item has an eligible source and positive finite energy. This is
an experimental index, not personal insulin, secretion, dose, pancreatic
workload or health benefit. There is no acute normalization, health band,
confidence percentage or personal interval. Arithmetic scaling tests make no
physiological proportionality claim.

Reuse the existing meal modeling and row construction for compatibility fields,
without supplying selected FII. Attach a separately typed, immutable assessment
before the single commit. One nullable TEXT column, no default/backfill, avoids
a second diary store or per-item migration. Ordered evidence lives in the
envelope. Existing rows remain not evaluated; corrupt evidence fails closed.

The new router is unmounted. Current production routes, active CSV, formulas,
fallbacks, Rust fixtures and response meanings remain unchanged. The added
column is available to the existing migration shim when explicitly run later;
this task runs it only against synthetic databases. Production activation and
owner-data migration are separate decisions. R3 must hide/separate compatibility
output and present unavailability before activation. No assessment is supplied
to chronic/trend services.

Validation uses isolated HTTP apps, temporary SQLite, concurrent unique-key
races, rollback injection, separate synthetic goldens and a Decimal oracle.
Existing characterization and Python/Rust parity fixtures are retained unchanged.
The local before/after comparison and independent staged-diff review are software
verification, not owner acceptance or clinical validation.
