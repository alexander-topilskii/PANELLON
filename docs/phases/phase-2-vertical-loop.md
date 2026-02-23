# Фаза 2 — Вертикальный loop [M1]

RTD [+]

**Цель:** Создать фундамент структуры здания (многоэтажность), настроить специальные стартовые этажи (0–5) и реализовать механику переходов (лестницы).

**Ключевые документы:**

- [../TECH_SPEC.md](../TECH_SPEC.md) §1 (floor model: этажи 0–5 — templates), §3 (corridor ↔ room transition, fade)
- [../UX_FLOWS.md](../UX_FLOWS.md) §3 — floor transition flow
- [../PERFORMANCE_BUDGET.md](../PERFORMANCE_BUDGET.md) — floor transition ≤ 700 мс (hard limit 1200 мс)
- [../RISK_REGISTER.md](../RISK_REGISTER.md) R3 — утечки памяти при переходах

---

## 2.1 Этажи 0 и 1–5 (Специальные шаблоны)

- [x] Определить модель Floor (`FloorDescriptor`: number, type, width, depth, height, stairs, spawn)
- [x] **Этаж 0:** вестибюль 6×6×2.5 м, светящаяся площадка-лестница у дальней стены (z = -2.5)
- [x] **Этажи 1–5:** прямой коридор 30×4×2.5 м (меши пола, потолка, стен), лестницы на обоих концах (z = ±14)
- [x] HUD-элемент «Этаж N» в углу экрана
- [x] `FloorManager`: загрузка и выгрузка геометрии этажа (`disposeFloor` → traverse + dispose)

## 2.2 Лестницы и fade-переходы

- [x] Геометрия лестницы: PlaneGeometry (emissive material, зелёный вверх / оранжевый вниз) + стрелка (ShapeGeometry)
- [x] Триггер-зона: `Box3` intersection игрока (playerBox 0.4×1.7×0.4) и площадки
- [x] При триггере: fade-out 300 мс (CSS opacity transition) → dispose старого → loadFloor → спавн → fade-in
- [x] Позиции: этаж 0 — одна лестница вверх; этажи 1–5 — две лестницы на концах коридора

---

**MVP (Definition of Done):**

- [x] Старт на этаже 0 → подъём через 1–5 → вижу смену этажей
- [ ] 20+ переходов туда-обратно без падения FPS и утечек — ожидает ручного теста
- [x] HUD корректно показывает номер этажа

---

## Принятые решения (Phase 2)

| Вопрос | Решение | Обоснование |
|--------|---------|-------------|
| Архитектура этажей | `FloorDescriptor` (data) + `buildFloor` (Three.js) + `FloorManager` (lifecycle) | Чёткое разделение: описание → геометрия → управление. Descriptor не зависит от Three.js, тестируем отдельно |
| Вестибюль из Phase 1 | Заменён на `buildFloor` с desc.type='lobby' | Единый path для всех этажей; `vestibule.ts` больше не используется в main |
| Лестница вниз на этаже 0 | Не создаётся (нет этажа -1) | `FloorManager.update()` пропускает `targetFloor < 0` |
| Fade overlay | CSS transition (opacity 300ms), не Three.js post-process | Проще, не зависит от рендер-пайплайна, работает даже при WebGL-ошибке |
| Освещение линейных этажей | Точечные лампы через каждые 6 м, intensity с лёгкой вариацией sin() | Тусклый свет по спецификации; вариация создаёт ощущение «неравномерности» лиминального пространства |
| Player spawn при переходе | По `desc.spawn` — у лестницы «вниз» | Игрок появляется у лестницы, через которую пришёл |
| disposeFloor | traverse + dispose для geometry и material | Предотвращаем утечки памяти; один этаж в памяти |
| Chunk size warning | Игнорируем (three.js ~500KB) | Решение о code-splitting отложено на фазу 7 (polish) |
