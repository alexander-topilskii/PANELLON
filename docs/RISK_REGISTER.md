# Risk Register

## R1 — GPU/Driver Variability

- Impact: High
- Likelihood: Medium
- Risk: shader behavior diverges across hardware.
- Mitigation:
  - constrain shader features by tier;
  - fallback shader path;
  - test matrix on at least 2 GPU vendors.

## R2 — Compile/Validation Stalls

- Impact: High
- Likelihood: Medium
- Risk: room entry stalls due to retries/compilation.
- Mitigation:
  - hard retry cap;
  - async generation and prewarm nearby rooms;
  - instant fallback on timeout.

## R3 — Memory Growth Over Long Sessions

- Impact: High
- Likelihood: Medium
- Risk: leaks from meshes/materials/render targets.
- Mitigation:
  - strict dispose discipline;
  - soak tests;
  - runtime debug counters.

## R4 — IndexedDB Quota Exhaustion

- Impact: Medium
- Likelihood: High
- Risk: cache writes fail unexpectedly.
- Mitigation:
  - LRU eviction;
  - soft cap tracking;
  - preserve archive separately from cache eviction.

## R5 — Scope Creep

- Impact: High
- Likelihood: High
- Risk: adding content features before stabilizing core loop.
- Mitigation:
  - milestone gates (M0..M6);
  - no tier expansion before performance pass.

## R6 — Determinism Regressions

- Impact: High
- Likelihood: Medium
- Risk: same seed yields different topology after refactors.
- Mitigation:
  - deterministic contract tests;
  - versioned keying;
  - ADR required for determinism-affecting changes.
