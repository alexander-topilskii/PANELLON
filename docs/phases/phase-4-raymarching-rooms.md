# Фаза 4 — Raymarching-комнаты [M3]

**Цель:** Подключить генерацию Raymarching-шейдеров, связать комнаты с коридорами и реализовать надёжную систему валидации.

**Ключевые документы:**

- [../SHADER_PIPELINE.md](../SHADER_PIPELINE.md) — полный pipeline генерации, грамматика, валидация, parameter guardrails
- [../ADR/0004-room-generation-and-validation.md](../ADR/0004-room-generation-and-validation.md) — retry cap 20, пороги валидации (luminance < 0.02, variance < 0.001)
- [../DETERMINISM_CONTRACT.md](../DETERMINISM_CONTRACT.md) — Room_ID = hash(version, globalSeed, floor, x, z)
- [../TECH_SPEC.md](../TECH_SPEC.md) §3 — corridor ↔ room transition (shaderPos = worldPos − roomCenter)
- [../PERFORMANCE_BUDGET.md](../PERFORMANCE_BUDGET.md) — adaptive scale 0.5–1.0×, raymarch steps per tier
- [../UX_FLOWS.md](../UX_FLOWS.md) §2 — exploration flow (door approach → room entry → exit)
- [../ADR/0001-tech-stack-and-rendering.md](../ADR/0001-tech-stack-and-rendering.md) — гибридный рендер (mesh corridors + fullscreen raymarch rooms)

**Примечание:** до фазы 6 кэш комнат — in-memory `Map` на этаж. При dispose этажа Map теряется, при повторном входе на этаж комнаты перегенерируются. Persistent кэш (IndexedDB) появляется в фазе 6.

---

## 4.1 Raymarching-шаблон

- [ ] Fullscreen quad + ShaderMaterial
- [ ] Фрагментный шейдер: uniforms (`uCameraPos`, `uCameraDir`, `uResolution`, `uTime`), raymarch loop (~100 шагов), слот `sceneSDF`
- [ ] Тестовая сцена: сфера
- [ ] **Adaptive resolution (базовая):** рендер в `WebGLRenderTarget` (фиксированный scale 0.5×), upscale на экран. Автоматический подбор scale по FPS — в фазе 6.

## 4.2 Интеграция коридор ↔ комната

- [ ] Дверной проём (~1.5 м) в стене коридора ячейки (выбор стены по hash)
- [ ] Триггер-зона AABB перед дверью: пересечение → `isInRoom = true`
- [ ] `isInRoom`: скрыть коридор, показать fullscreen quad
- [ ] Координатный мост: `shaderCameraPos = playerWorldPos − roomWorldCenter`
- [ ] Выход: позиция за пределами проёма → `isInRoom = false`, обратно в коридор
- [ ] Коллизия внутри: bounds box 4×4×2.5 м

## 4.3 Один примитив

- [ ] Room_ID = hash(version, globalSeed, floor, x, z)
- [ ] Генератор: один примитив (sphere / box / cylinder) по Room_ID из PRNG
- [ ] Параметры (радиус, размер, позиция) из PRNG с guardrails (см. SHADER_PIPELINE)
- [ ] Вставка в слот `sceneSDF` шаблона
- [ ] Fallback при ошибке компиляции — gradient shader

## 4.4 Комбинации

- [ ] AST-генератор: дерево глубины 2 (`combine(A, B)`)
- [ ] Combiners: `min` (union), `max` (intersection), `smoothMin` (blend)
- [ ] Компилятор: AST → строка GLSL

## 4.5 Модификаторы

- [ ] Узлы: `twist`, `bend`, `repeat`
- [ ] Параметры из PRNG с guardrails (twist/bend: ±π, repeat: period 0.5–4.0)

## 4.6 Валидация и retry

### 4.6a Асинхронная валидация

- [ ] Offscreen рендер в `WebGLRenderTarget(16×16)`
- [ ] `readPixels` → средняя яркость и variance

### 4.6b Retry-логика

- [ ] Чёрный экран: яркость < 0.02 AND variance < 0.001
- [ ] При провале: Room_ID + salt, до 20 попыток
- [ ] При полном провале: ячейка → `"empty"` (глухая стена, нет двери)
- [ ] Результат → `Map<"x,z", "valid" | "empty">` на этаж (in-memory)

## 4.7 Нормализация SDF

- [ ] Bounding-оценка дерева → смещение к (0, 0, 0)
- [ ] Масштабирование: объект вписывается в сферу ~1.5 м
- [ ] Ограничение пропорций примитивов (нет плоских дисков и игл)

---

**MVP (Definition of Done):**

- [ ] Иду по коридору → захожу через проём → вижу процедурную фигуру → выхожу обратно
- [ ] Разные комнаты — разные фигуры (sphere, box, cylinder, комбинации, twist)
- [ ] Нет чёрных комнат: либо рабочий шейдер, либо глухая стена
- [ ] Объекты вписываются в комнату, расположены по центру
