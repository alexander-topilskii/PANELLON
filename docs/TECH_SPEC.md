# Technical Specification

## 1. Seed and PRNG Contract

### Hash Function

- **Строка → число:** `mulberry32`. Seed string (UTF-8) → `globalSeed` через детерминированный hash.
- Реализация: последовательное применение mulberry32 по байтам строки, финальное состояние — `globalSeed`.
- Все процедурные ветки используют PRNG, инициализированный от `globalSeed`.

### Seed Source

- `seedSource` priority:
  1. query param `?seed=...`
  2. value from start screen input
  3. last session seed from localStorage
  4. default `"official"`

## 2. Room Identity

- `Room_ID = hash(version, globalSeed, floor, gridX, gridZ)`.
- `version` included to isolate incompatible grammar upgrades.

## 3. Floor Model

- Floors `0..5` are special-case templates.
- Floors `6+` use procedural grid descriptor.
- Logical room count:
  - `rooms = floor(1 + 0.01 * floor^2)`.
- `side = ceil(sqrt(rooms))`.

Implementation note: floor is generated lazily by chunk; no full-grid eager generation.

## 3.1 DFS-Maze Algorithm

Лабиринт на сетке N×N строится как spanning tree — гарантированная связность, без циклов.

**Алгоритм (Randomized DFS / Recursive Backtracking):**

1. Инициализация: все ячейки «не посещены». Стек = [стартовая ячейка (0,0)].
2. Пока стек не пуст:
   - Текущая ячейка = вершина стека.
   - Соседи (up, down, left, right в пределах сетки) — только не посещённые.
   - Порядок обхода соседей — shuffle по `PRNG(floor, current_cell, neighbor_index)` (детерминированно от seed).
   - Если есть не посещённый сосед: убираем стену между текущей и выбранным соседом, помечаем соседа посещённым, пушим в стек.
   - Иначе — pop из стека.
3. Результат: множество убранных стен (проходов). Остальные стены — глухие.

**Seed:** `mazeSeed = hash(globalSeed, floor)`. PRNG для shuffle инициализируется от mazeSeed. Один seed → один и тот же лабиринт.

## 4. Chunking Contract

- Chunk coordinate: `(chunkX, chunkZ)`.
- Chunk size: fixed `N x N` grid cells (default `N=16`). Chunk — единица генерации топологии.
- **Active radius:** в **ячейках** (не в чанках). Значение по умолчанию: 20 ячеек от позиции игрока.
  - На этажах с сеткой ≤ 20×20 — рендерим весь этаж.
  - На больших этажах — только меши коридоров в радиусе 20 ячеек. При движении — добавляем/удаляем чанки.
- World generator must be pure:
  - same `(seed, floor, chunkX, chunkZ, version)` -> same descriptor.

## 5. Corridor Collision

- Split-axis resolution:
  1. attempt X movement and resolve;
  2. attempt Z movement and resolve.
- Y handled by fixed ground plane in v1 (no jump).

## 6. Corridor <-> Room Transition

- Door trigger enters room mode.
- Camera transform to room space:
  - `shaderPos = worldPos - roomCenter`.
- Exit trigger returns to corridor mode.
- Transition uses fade state (`~0.3s`) for floor switches only.

## 7. Shader Generation Pipeline

1. Build AST from grammar profile by floor tier.
2. Emit GLSL into stable template.
3. Compile shader.
4. Validate output in small buffer.
5. On fail: retry with deterministic salt.
6. On retry limit: mark cell `empty`.

Default retry limit: `20`.

## 8. Validation Rule

Room considered invalid if **all** are true:

- average luminance < `0.02` (буфер 16×16, linear RGB);
- luminance variance < `0.001` (чтобы отсечь полностью плоские чёрные поля);
- no compilation warnings promoted to error.

This avoids rejecting intentionally dark but non-empty scenes.

## 9. Storage Contract

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

## 10. Versioning and Migration

- Any grammar-breaking change increments `GEN_VERSION`.
- On `GEN_VERSION` mismatch:
  - old `cache` entries ignored or soft-cleaned;
  - `archive` preserved.

## 11. Failure Modes

- WebGL2 unavailable -> blocking fallback screen.
- Shader compile failures -> fallback room shader + telemetry event.
- Quota exceeded -> evict cache by LRU; never auto-delete archive.

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — границы модулей и runtime-model
- [SHADER_GRAMMAR.md](SHADER_GRAMMAR.md) — grammar и ограничения
- [DATA_MODEL.md](DATA_MODEL.md) — storage schema и migration
- [TEST_PLAN.md](TEST_PLAN.md) — проверка контрактов и регрессий
- [ADR/0002-determinism-contract.md](ADR/0002-determinism-contract.md)
- [ADR/0004-room-generation-and-validation.md](ADR/0004-room-generation-and-validation.md)
- [ADR/0005-storage-and-versioning.md](ADR/0005-storage-and-versioning.md)
