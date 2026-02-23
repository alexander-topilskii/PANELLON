# Фаза 6 — Кэш и атмосфера [M5]

RTD [+]

**Цель:** Убрать задержки повторного входа в комнаты (IndexedDB), создать лиминальную атмосферу в коридорах, довести adaptive resolution до автоматики.

**Ключевые документы:**

- [../DATA_MODEL.md](../DATA_MODEL.md) — IndexedDB schema (stores: cache, archive, meta), ключи, индексы
- [../ADR/0005-storage-and-versioning.md](../ADR/0005-storage-and-versioning.md) — решение по хранению и версионированию
- [../TECH_SPEC.md](../TECH_SPEC.md) §4 (storage contract), §5 (versioning/migration)
- [../PERFORMANCE_BUDGET.md](../PERFORMANCE_BUDGET.md) — memory budgets (cache ≤ 500 MB, heap ≤ 350 MB)
- [../RISK_REGISTER.md](../RISK_REGISTER.md) R4 — IndexedDB quota exhaustion

---

## 6.1 IndexedDB кэш

### 6.1a Setup

- [ ] IndexedDB wrapper (библиотека `idb` или своя обёртка)
- [ ] Создать stores: `cache`, `archive`, `meta` (по DATA_MODEL.md)

### 6.1b Кэш-логика

- [ ] Формат ключа: `v{GEN_VERSION}:{globalSeed}:{floor}:{x}:{z}`
- [ ] Значение: GLSL-код (string) или маркер `"empty"`
- [ ] Перед генерацией — проверка кэша (hit → подставляем, skip generation)
- [ ] LRU-эвикция при > 500 МБ (суммарный размер в store `meta`)

## 6.2 Освещение коридоров

- [ ] `PointLight`'ы: позиции по `hash(floor, segment)` (детерминированно), каждые 2–3 ячейки
- [ ] Тёплый цвет, слабая интенсивность, ограниченные `distance` / `decay`
- [ ] Этажи 1–5: мерцание (`sin(time) * noise`)

## 6.3 Освещение в шейдерах

- [ ] Ключевой свет от двери: `uniform vec3 uDoorDir`
- [ ] Диффузное: `max(dot(normal, uDoorDir), 0.0)`
- [ ] Слабый ambient (тени не абсолютно чёрные)

## 6.4 Adaptive resolution tuning

- [ ] Автоматический подбор scale (0.5–1.0×) по текущему FPS
- [ ] Если FPS < 45 → снижаем scale; если FPS стабильно > 55 → повышаем
- [ ] Базовый механизм (фиксированный scale) уже работает с фазы 4.1

---

**MVP (Definition of Done):**

- [ ] Повторный вход в комнату — мгновенно (из IndexedDB)
- [ ] Кэш сохраняется между перезагрузками страницы
- [ ] Коридоры: тёплый полумрак, мерцание на этажах 1–5
- [ ] Комнаты: направленный свет от двери
- [ ] 30-минутный soak test без деградации FPS и монотонного роста heap
