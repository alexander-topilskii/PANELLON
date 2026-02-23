# Technical Specification

Этот документ содержит контракты, описывающие физику, состояния и хранение. Детали генерации вынесены в отдельные документы (см. `See Also`).

## 1. Floor Model

- Floors `0..5` are special-case templates.
- Floors `6+` use procedural grid descriptor.
- Logical room count:
  - `rooms = floor(1 + 0.01 * floor^2)`.
- `side = ceil(sqrt(rooms))`.

## 2. Corridor Collision

- Split-axis resolution:
  1. attempt X movement and resolve;
  2. attempt Z movement and resolve.
- Y handled by fixed ground plane in v1 (no jump).

## 3. Corridor <-> Room Transition

- Door trigger enters room mode.
- Camera transform to room space:
  - `shaderPos = worldPos - roomCenter`.
- Exit trigger returns to corridor mode.
- Transition uses fade state (`~0.3s`) for floor switches only.

## 4. Storage Contract

### localStorage keys

- `panellon.seed`
- `panellon.floor`
- `panellon.position`
- `panellon.version`

### IndexedDB stores

- `cache`: generated room payloads (`valid` or `empty`). Soft cap 500 MB; LRU eviction при превышении.
- `archive`: user-bookmarked finds (не эвиктится автоматически)
- `meta`: cache size, LRU metadata, schema version

Cache key format:

- `v{version}:{seed}:{floor}:{x}:{z}`

## 5. Versioning and Migration

- Any grammar-breaking change increments `GEN_VERSION`.
- On `GEN_VERSION` mismatch:
  - old `cache` entries ignored or soft-cleaned;
  - `archive` preserved.

## 6. Runtime Requirements

- **WebGL2 required.** Checked at startup via `WebGL.isWebGL2Available()`.

## 7. Failure Modes

- WebGL2 unavailable -> blocking fallback screen.
- Shader compile failures -> fallback room shader + telemetry event.
- Quota exceeded -> evict cache by LRU; never auto-delete archive.

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — границы модулей и runtime-model
- [DETERMINISM_CONTRACT.md](DETERMINISM_CONTRACT.md) — контракты PRNG и хэширования
- [WORLD_GENERATION.md](WORLD_GENERATION.md) — топология лабиринта и генерация чанков
- [SHADER_PIPELINE.md](SHADER_PIPELINE.md) — генерация, грамматика и валидация шейдеров
- [DATA_MODEL.md](DATA_MODEL.md) — storage schema и migration
- [TEST_PLAN.md](TEST_PLAN.md) — проверка контрактов и регрессий
- [ADR/0002-determinism-contract.md](ADR/0002-determinism-contract.md)
- [ADR/0004-room-generation-and-validation.md](ADR/0004-room-generation-and-validation.md)
- [ADR/0005-storage-and-versioning.md](ADR/0005-storage-and-versioning.md)
- [ADR/0007-maze-topology-and-chunking.md](ADR/0007-maze-topology-and-chunking.md)
