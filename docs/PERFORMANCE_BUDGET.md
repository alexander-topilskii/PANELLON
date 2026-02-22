# Performance Budget

## Primary Targets

- Frame rate target: 60 FPS (desktop baseline), acceptable floor: 45 FPS.
- Frame time budget:
  - target: <= 16.6 ms
  - acceptable p95: <= 22 ms
- Floor transition:
  - fade + load + fade target <= 700 ms
  - hard limit <= 1200 ms

## Rendering Budgets

- Corridor render calls:
  - p50 <= 250
  - p95 <= 450
- Room raymarch:
  - adaptive scale range `0.5..1.0`;
  - max raymarch steps tuned per tier;
  - degrade quality before dropping below 45 FPS.

## Memory Budgets

- Runtime JS heap soft target <= 350 MB.
- GPU memory usage soft target <= 500 MB.
- IndexedDB cache soft cap <= 500 MB (evict by LRU).

Archive store is not evicted automatically.

## Measurement Plan

- In-game perf HUD (dev mode):
  - FPS (instant, avg, p95);
  - frame breakdown estimates;
  - active chunks count;
  - cached rooms hit ratio.
- Long session soak:
  - 30 min scripted traversal;
  - verify no monotonic heap growth.

## Regression Rules

- Any PR that changes generation/render path must include before/after perf note.
- If p95 frame time worsens by >10% on baseline scene, change requires explicit sign-off.
