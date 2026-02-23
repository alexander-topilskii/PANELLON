# Roadmap

## Milestone M0 — Core Boot

plan.md: фаза 1 (этапы 1.1, 1.2)

Scope:

- project bootstrap;
- first-person controls;
- start seed flow.

DoD:

- user can start session with seed;
- stable game loop and camera control;
- pause/unlock works.

## Milestone M1 — Vertical Loop

plan.md: фаза 2 (этапы 2.1, 2.2)

Scope:

- floors 0..5 templates;
- stairs meshes and trigger zones;
- floor transitions with fade and resume.

DoD:

- 20+ floor transitions in one session without crash;
- resume restores floor and position.

## Milestone M2 — Procedural Corridors (6+)

plan.md: фаза 3 (этапы 3.1, 3.2, 3.3)

Scope:

- DFS-maze corridor generation on test grid;
- floor formula and multi-floor support for floors 6+;
- chunked corridor mesh streaming (eager topology + chunked meshes, ADR-0007).

DoD:

- maze topology generated eagerly, meshes streamed by active radius;
- deterministic chunk recreation verified;
- floor 100 runs without frame drops.

## Milestone M3 — Room Pipeline v1

plan.md: фаза 4 (этапы 4.1–4.7)

Scope:

- raymarching template with adaptive resolution;
- corridor-room transition;
- grammar AST: primitives, combiners, modifiers;
- validation, retry, normalization;
- valid/empty room status cache.

DoD:

- room mode works bidirectionally;
- retry and fallback logic operational;
- ≥90% rooms in active zone produce valid render.

## Milestone M4 — Content Quality

plan.md: фаза 5 (этапы 5.1–5.4)

Scope:

- preview textures in doors;
- grammar tiers by floor bands (21–50, 51–150, 151+);
- color/noise/animation profiles.

DoD:

- visible complexity progression across tiers;
- no persistent black-room regressions.

## Milestone M5 — Performance and Storage

plan.md: фаза 6 (этапы 6.1–6.3)

Scope:

- IndexedDB cache with LRU;
- corridor and room lighting;
- adaptive resolution tuning.

DoD:

- target frame budgets hold on reference devices;
- 30 min soak test passes.

## Milestone M6 — Product Layer

plan.md: фаза 7 (этапы 7.1, 7.2)

Scope:

- position save/restore via localStorage;
- archive interactions;
- settings UI;
- release hardening.

DoD:

- user can save/open archived finds;
- error states are user-readable and recoverable.

## See Also

- [../plan.md](../plan.md) — детальный breakdown этапов
- [ARCHITECTURE.md](ARCHITECTURE.md) — модульные зависимости
- [TECH_SPEC.md](TECH_SPEC.md) — контракты, которые реализуются по milestone
- [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md) — критерии M5
- [TEST_PLAN.md](TEST_PLAN.md) — release gates
