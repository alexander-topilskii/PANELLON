# Roadmap

## Milestone M0 — Core Boot

Scope:

- project bootstrap;
- first-person controls;
- start seed flow.

DoD:

- user can start session with seed;
- stable game loop and camera control;
- pause/unlock works.

## Milestone M1 — Vertical Loop

Scope:

- floors 0..5 templates;
- floor transitions and resume.

DoD:

- 20+ floor transitions in one session without crash;
- resume restores floor and position.

## Milestone M2 — Procedural Corridors (6+)

Scope:

- chunked floor descriptors;
- corridor mesh streaming;
- stairs placement.

DoD:

- no full-floor eager generation;
- deterministic chunk recreation verified.

## Milestone M3 — Room Pipeline v1

Scope:

- room identity and shader generation;
- corridor-room transition;
- valid/empty room status cache.

DoD:

- room mode works bidirectionally;
- retry and fallback logic operational.

## Milestone M4 — Content Quality

Scope:

- grammar tiers by floor bands;
- color/noise/animation profiles;
- preview textures in doors.

DoD:

- visible complexity progression across tiers;
- no persistent black-room regressions.

## Milestone M5 — Performance and Storage

Scope:

- adaptive resolution;
- memory and cache budgets;
- quota-safe storage policy.

DoD:

- target frame budgets hold on reference devices;
- 30 min soak test passes.

## Milestone M6 — Product Layer

Scope:

- archive interactions;
- settings UI;
- release hardening.

DoD:

- user can save/open archived finds;
- error states are user-readable and recoverable.
