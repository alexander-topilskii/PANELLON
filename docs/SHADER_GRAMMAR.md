# Shader Grammar Specification

## Goal

Generate varied but valid raymarch scenes from deterministic inputs.

## Node Families

1. Primitives
   - `sphere`, `box`, `cylinder`, `torus`, `plane`

2. Combiners
   - `min` (union)
   - `max` (intersection)
   - `smoothMin` (blended union)
   - subtraction pattern via `max(a, -b)`

3. Modifiers
   - `twist`
   - `bend`
   - `repeat`

4. Noise/Fractal
   - `noise3D`
   - `fbm`
   - `displace`
   - `menger`
   - `sierpinski`
   - `fractal_repeat`

5. Animation
   - `rotate_y`
   - `pulse`
   - `slide` (линейное смещение по оси, параметр от PRNG)
   - `morph`

## Tier Constraints

- Floors `6..20`: depth `1..2`, no fractals.
- Floors `21..50`: depth `2..3`, light noise/rotation.
- Floors `51..150`: depth `3..4`, displacement + simple fractal.
- Floors `151+`: depth `4..8`, full feature set with strict perf caps.

## Safety Rules

- Maximum AST depth and node count per tier are hard-limited.
- Generated code must compile under target GLSL profile.
- Forbidden patterns:
  - unbounded loops;
  - recursive macro expansion;
  - denominators without epsilon guards.

## Parameter Guardrails

Чтобы снизить долю вырожденных SDF и чёрных комнат:

- **sphere:** радиус `clamp(r, 0.1, 2.0)` м.
- **box:** размеры по осям `clamp(s, 0.1, 2.0)` м.
- **cylinder:** радиус `clamp(r, 0.1, 1.5)`, высота `clamp(h, 0.2, 2.5)` м.
- **torus:** большой радиус R `clamp(0.2, 1.0)`, малый r `clamp(0.05, 0.5)` м.
- **plane:** нормаль нормализована; смещение ограничено ±1 м.
- **repeat:** период `clamp(p, 0.5, 4.0)` м, итерации ≤ 4.
- **twist/bend:** угол `clamp(-π, π)`.

## Validation Hooks

Each candidate shader emits:

- compile success flag;
- render sample stats (mean, variance);
- optional complexity score.

## Evolution Rules

- Any grammar node semantic change requires `GEN_VERSION` bump.
- New node families require ADR entry and tier assignment update.

## See Also

- [TECH_SPEC.md](TECH_SPEC.md) — room pipeline, retry, validation
- [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md) — perf caps for shader tiers
- [TEST_PLAN.md](TEST_PLAN.md) — grammar determinism checks
- [ADR/0004-room-generation-and-validation.md](ADR/0004-room-generation-and-validation.md)
