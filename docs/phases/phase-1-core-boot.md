# Фаза 1 — Core Boot [M0]

RTD [+]

**Цель:** Запустить минимально играбельный слой: управление от первого лица и систему Seed-ов.

**Ключевые документы:**

- [../ARCHITECTURE.md](../ARCHITECTURE.md) — модули `core` (game loop, state machine), `input` (controls)
- [../DETERMINISM_CONTRACT.md](../DETERMINISM_CONTRACT.md) — mulberry32 hash, PRNG, приоритет seed
- [../TECH_SPEC.md](../TECH_SPEC.md) §2 — split-axis коллизия
- [../UX_FLOWS.md](../UX_FLOWS.md) §1 (start/seed flow), §4 (pause/pointer lock)
- [../ADR/0002-determinism-contract.md](../ADR/0002-determinism-contract.md) — контракт детерминизма

---

## 1.1 Ходьба (First-Person Controls & Physics)

Тестовая комната 6×6×2.5 м — это будущий вестибюль этажа 0. В фазе 2 к нему добавится лестница.

- [x] Инициализировать камеру (`PerspectiveCamera`, высота глаз ~1.7 м)
- [x] Реализовать PointerLockControls (мышь → обзор, Escape → unlock)
- [x] Добавить WASD-движение (нормализованный вектор `(dx, dz)` × `deltaTime`)
- [x] Создать тестовую комнату 6×6×2.5 м (пол, стены, потолок — MeshStandardMaterial)
- [x] Реализовать коллизию: Y зафиксирован, bounds check по X и Z (split-axis)

## 1.2 Seed-система и стартовый экран

- [x] Реализовать `mulberry32` hash (строка → число) и seedable PRNG
- [x] Создать стартовый экран (HTML over canvas): поле seed + кнопка «Войти»
- [x] Реализовать приоритет seed: URL `?seed=...` > input > localStorage > дефолт `"official"`
- [x] Настроить state machine: `MENU` → `PLAYING`

---

**MVP (Definition of Done):**

- [x] Запускаю → вижу стартовый экран
- [x] Ввожу seed, жму старт → мышь лочится, хожу WASD по комнате 6×6 м
- [x] Escape → анлок мыши
- [x] Один seed → одно поведение PRNG (тест детерминизма — 16 тестов в Vitest)

---

## Принятые решения (Phase 1)

| Вопрос | Решение | Обоснование |
|--------|---------|-------------|
| PointerLock | Собственная обёртка вместо `PointerLockControls` из Three.js | Меньше зависимостей, лучший контроль. Euler order YXZ для FPS-камеры; pitch clamp ±π/2 |
| Движение | `PlayerController` объединяет keyboard + pointer lock | Одна точка обновления в game loop; camera-relative forward/right |
| Скорость | 3.5 м/с | Комфортная пешеходная скорость для масштаба комнаты 6×6 м |
| Коллизия | Bounds clamping с margin 0.25 м | Split-axis: сначала X, затем Z. Margin предотвращает z-fighting у стен |
| Hash функция | FNV-1a для string→seed | Быстрая, хорошее распределение, без зависимостей. mulberry32 для PRNG из числового seed |
| Стартовый экран | HTML overlay в #ui-root | pointer-events: none на контейнере, auto на дочерних — не блокирует canvas для click-to-lock |
| State machine | Явные допустимые переходы, throw при нарушении | Ранняя диагностика ошибок; все состояния из ARCHITECTURE.md (boot/menu/corridor/room/transition/error) |
