# Фаза 3 — Процедурные коридоры [M2]

**Цель:** Создать ядро генерации лабиринта и геометрии коридоров для основных этажей (6+). Внедрить чанковую подгрузку для больших сеток.

**Ключевые документы:**

- [../WORLD_GENERATION.md](../WORLD_GENERATION.md) — DFS-maze алгоритм, chunking contract
- [../ADR/0007-maze-topology-and-chunking.md](../ADR/0007-maze-topology-and-chunking.md) — eager topology + chunked mesh (ключевое решение)
- [../ADR/0003-floor-generation-chunking.md](../ADR/0003-floor-generation-chunking.md) — исходное решение о chunking
- [../TECH_SPEC.md](../TECH_SPEC.md) §1 (floor formula), §2 (split-axis коллизия)
- [../DETERMINISM_CONTRACT.md](../DETERMINISM_CONTRACT.md) — mazeSeed = hash(globalSeed, floor)
- [../PERFORMANCE_BUDGET.md](../PERFORMANCE_BUDGET.md) — corridor render calls (p50 ≤ 250, p95 ≤ 450)

---

## 3.1 Коридорные меши и коллизия (Ядро лабиринта)

### 3.1a Data-слой

- [ ] Реализовать Iterative Randomized DFS (по WORLD_GENERATION.md)
- [ ] Структура: `Uint8Array(side * side)`, 1 байт на ячейку (4 бита стен + 1 бит visited)
- [ ] mazeSeed = hash(globalSeed, floor), PRNG shuffle соседей
- [ ] Тест на фиксированной сетке 3×3: проверить связность и детерминизм

### 3.1b Render-слой

- [ ] Генерация геометрии: InstancedMesh для стен, пола, потолка
- [ ] Ячейка 6×6 м: центральная коробка 4×4 (будущая комната) + коридор 2 м по периметру
- [ ] Убрать instance'ы стен между ячейками на основе битовой маски (= проходы)

### 3.1c Physics-слой

- [ ] Split-axis AABB коллизия для всех стен на этаже
- [ ] Массив `Box3` для стеновых сегментов
- [ ] Проверка: X-движение → resolve → Z-движение → resolve (скольжение вдоль стен)

## 3.2 Многоэтажность (6+)

- [ ] Формула роста: `rooms = floor(1 + 0.01 * floor²)`, `side = ceil(sqrt(rooms))`
- [ ] Eager maze topology при входе на этаж (ADR-0007)
- [ ] Лестница на этажах 6+: две площадки (вверх/вниз) в одной точке, позиция по hash(floor) на краю сетки
- [ ] Данные этажа: grid + maze walls + `Map<"x,z", status>`
- [ ] Структура данных Grid: `{ side, cells: Uint8Array, stairPos }` (подготовлена в фазе 1.2 как PRNG, реализуется здесь)

## 3.3 Chunked corridors

- [ ] На этажах с сеткой > 20×20: меши только в радиусе 20 ячеек от игрока
- [ ] Chunk size: 16×16 ячеек (единица mesh lifecycle)
- [ ] При движении: добавляем новые chunk-меши, dispose дальних
- [ ] На малых этажах (≤ 20×20): генерация мешей целиком (без chunking)

---

**MVP (Definition of Done):**

- [ ] Этаж 10: хожу по лабиринту, не прохожу сквозь стены. Другой seed — другой лабиринт
- [ ] Этаж 100 (11×11): коллизии работают, лагов нет
- [ ] Этаж 500 (~50×50): chunking работает, меши подгружаются на лету без фризов
- [ ] Детерминизм: один seed → одна топология (unit test)
