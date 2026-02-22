# Test Plan

## 1. Test Levels

- Unit tests:
  - seed hashing;
  - PRNG determinism;
  - room/chunk key builders;
  - grammar AST invariants.
- Integration tests:
  - floor/chunk generation contracts;
  - shader generation + validation pipeline;
  - storage read/write and migration behavior.
- E2E smoke:
  - startup to exploration flow;
  - corridor -> room -> corridor loop;
  - floor transitions and resume.

## 2. Determinism Matrix

For fixed `(version, seed, floor, x, z)` verify equality of:

- Room_ID;
- AST shape checksum;
- generated GLSL checksum;
- final room status (`valid`/`empty`).

## 3. Reliability Tests

- Retry limit hit handling.
- Fallback shader path correctness.
- WebGL context loss recovery (where supported).
- IndexedDB quota exceeded behavior.

## 4. Performance Tests

- Scene benchmark on representative floors:
  - `floor 6`, `floor 50`, `floor 200`.
- 30-minute traversal soak:
  - no crash;
  - no unbounded heap growth;
  - frame time remains in acceptable band.

## 5. UX Acceptance Tests

- Start seed priority order works exactly as specified.
- Escape/pointer lock behavior predictable.
- User-visible errors are actionable.
- Archive saves and reopens entries reliably.

## 6. Release Gate (v1)

Release candidate passes only if:

- all critical and high severity test failures are resolved;
- determinism checks pass on CI baseline;
- performance budget not violated on baseline hardware.

## See Also

- [TECH_SPEC.md](TECH_SPEC.md) — контракты, которые тестируем
- [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md) — целевые метрики
- [ROADMAP.md](ROADMAP.md) — milestone DoD
- [RISK_REGISTER.md](RISK_REGISTER.md) — risk-driven test focus
- [ADR/0002-determinism-contract.md](ADR/0002-determinism-contract.md)
