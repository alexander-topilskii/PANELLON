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

- [ ] Инициализировать камеру (`PerspectiveCamera`, высота глаз ~1.7 м)
- [ ] Реализовать PointerLockControls (мышь → обзор, Escape → unlock)
- [ ] Добавить WASD-движение (нормализованный вектор `(dx, dz)` × `deltaTime`)
- [ ] Создать тестовую комнату 6×6×2.5 м (пол, стены, потолок — MeshStandardMaterial)
- [ ] Реализовать коллизию: Y зафиксирован, bounds check по X и Z (split-axis)

## 1.2 Seed-система и стартовый экран

- [ ] Реализовать `mulberry32` hash (строка → число) и seedable PRNG
- [ ] Создать стартовый экран (HTML over canvas): поле seed + кнопка «Войти»
- [ ] Реализовать приоритет seed: URL `?seed=...` > input > localStorage > дефолт `"official"`
- [ ] Настроить state machine: `MENU` → `PLAYING`

---

**MVP (Definition of Done):**

- [ ] Запускаю → вижу стартовый экран
- [ ] Ввожу seed, жму старт → мышь лочится, хожу WASD по комнате 6×6 м
- [ ] Escape → анлок мыши
- [ ] Один seed → одно поведение PRNG (тест детерминизма)
