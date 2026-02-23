# World Generation

Этот документ описывает алгоритмы генерации этажей, коридоров и чанков.

## 1. Floor Model

- Floors `0..5` are special-case templates.
- Floors `6+` use procedural grid descriptor.
- Logical room count:
  - `rooms = floor(1 + 0.01 * floor^2)`.
- `side = ceil(sqrt(rooms))`.

## 2. DFS-Maze Algorithm

Лабиринт на сетке N×N строится как spanning tree — гарантированная связность, без циклов.

**Стратегия: eager topology + chunked mesh (ADR-0007).** Topology генерируется целиком при входе на этаж. Mesh generation — только для активного радиуса.

**Алгоритм (Iterative Randomized DFS):**

1. Инициализация: `Uint8Array(side * side)` — 1 байт на ячейку (4 бита стен + 1 бит visited). Стек = [стартовая ячейка (0,0)].
2. Пока стек не пуст:
   - Текущая ячейка = вершина стека.
   - Соседи (N, S, E, W в пределах сетки) — только не посещённые.
   - Порядок обхода соседей — shuffle по PRNG (детерминированно от mazeSeed).
   - Если есть не посещённый сосед: убираем стену между текущей и выбранным соседом, помечаем соседа посещённым, пушим в стек.
   - Иначе — pop из стека.
3. Результат: компактная bitfield-структура. Стены, не убранные DFS — глухие.

**Seed:** `mazeSeed = hash(globalSeed, floor)`. PRNG для shuffle инициализируется от mazeSeed. Один seed → один и тот же лабиринт.

**Performance (см. ADR-0007):**

| side  | Ячеек   | Память  | Время DFS |
|-------|---------|---------|-----------|
| 51    | 2601    | ~1.3 KB | < 1 ms    |
| 101   | 10201   | ~5 KB   | < 5 ms    |
| 500   | 250000  | ~125 KB | ~50 ms    |
| 1000  | 1000000 | ~500 KB | ~200 ms   |

Для этажей с side > 500 (недостижимых при обычной игре): DFS выполняется асинхронно в рамках бюджета floor-transition (700 мс).

## 3. Chunking Contract

Chunking применяется к **mesh generation**, не к topology. Topology уже готова после генерации лабиринта.

- Chunk coordinate: `(chunkX, chunkZ)`.
- Chunk size: fixed `N x N` grid cells (default `N=16`). Chunk — единица mesh lifecycle (add/remove).
- **Active radius:** в **ячейках** (не в чанках). Значение по умолчанию: 20 ячеек от позиции игрока.
  - На этажах с сеткой ≤ 20×20 — рендерим весь этаж (все меши сразу).
  - На больших этажах — строим меши только для ячеек в радиусе. Стены читаются из готовой topology.
  - При движении — добавляем новые chunk-меши, dispose дальних.
- World generator must be pure:
  - same `(seed, floor, chunkX, chunkZ, version)` -> same mesh descriptor.

## See Also

- [TECH_SPEC.md](TECH_SPEC.md) — основной свод технических контрактов
- [ADR/0007-maze-topology-and-chunking.md](ADR/0007-maze-topology-and-chunking.md)
