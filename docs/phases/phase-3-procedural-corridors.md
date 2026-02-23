# Фаза 3 — Процедурные коридоры [M2]

RTD [+]

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

- [x] Реализовать Iterative Randomized DFS (по WORLD_GENERATION.md)
- [x] Структура: `Uint8Array(side * side)`, 1 байт на ячейку (4 бита стен + 1 бит visited)
- [x] mazeSeed = hash(globalSeed, floor), PRNG shuffle соседей
- [x] Тесты: связность, детерминизм, spanning tree (N-1 passages), wall consistency, edge cases (1×1, 50×50)

### 3.1b Render-слой

- [x] Генерация геометрии: BoxGeometry стены по ячейкам (corridor-builder.ts)
- [x] Ячейка 6×6 м: стены по битовой маске, пол + потолок per-range
- [x] Убрать стены между ячейками на основе DFS passages

### 3.1c Physics-слой

- [x] Split-axis AABB коллизия для всех стен на этаже (maze-collision.ts)
- [x] Массив `Box3` для стеновых сегментов (wallBoxes)
- [x] FloorManager переключает collision mode: bounds-only для 0–5, wall-aware для 6+

## 3.2 Многоэтажность (6+)

- [x] Формула роста: `rooms = floor(1 + 0.01 * floor²)`, `side = ceil(sqrt(rooms))`
- [x] Eager maze topology при входе на этаж
- [x] Лестница на этажах 6+: две площадки (вверх/вниз) в одной точке, позиция по hash(floor) на краю сетки
- [x] Интеграция в FloorManager: globalSeed, mazeSeed, генерация + dispose

## 3.3 Chunked corridors

- [x] На малых этажах (≤ 20×20): генерация мешей целиком (текущая реализация)
- [ ] На больших этажах (> 20×20): chunk-based mesh streaming — отложено, т.к. для MVP достаточно текущей реализации; на этажах до ~500 (side=51) производительность приемлема

---

**MVP (Definition of Done):**

- [x] Этаж 10: лабиринт с коллизиями, разные seed → разная топология
- [x] Этаж 100 (11×11): коллизии работают
- [ ] Этаж 500 (~50×50): chunk streaming отложен (3.3 partial)
- [x] Детерминизм: 11 unit-тестов на maze generation

---

## Принятые решения (Phase 3)

| Вопрос | Решение | Обоснование |
|--------|---------|-------------|
| Mesh-строение стен | BoxGeometry per wall segment (не InstancedMesh) | Проще, надёжнее для коллизий (Box3 per mesh). InstancedMesh — оптимизация для Phase 6+ если нужна |
| Collision на maze-этажах | Отдельный `resolveWallCollisions` в FloorManager | На этажах 0–5 PlayerController использует bounds-clamping; на 6+ FloorManager применяет стену-по-стене коллизию. Разделение ответственности |
| Позиция лестницы | `edgeIndexToCell`: линейный обход периметра | Гарантирует лестницу на краю сетки; детерминизм через roomHash |
| Chunked corridors (partial) | Отложен для больших этажей | MVP покрывает этажи до ~500 (side=51, 2601 cell). Для side > 100 нужна chunk-система — добавим при необходимости |
| Освещение maze-этажей | PointLight каждые 4 ячейки | Приемлемый баланс плотности и производительности; лиминальная атмосфера тёплого света |
