# Фаза 4 — Raymarching-комнаты [M3]

RTD [+]

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

## 4.1 Raymarching-шаблон ✅

- [x] Fullscreen quad + ShaderMaterial
- [x] Фрагментный шейдер: uniforms (`uCameraPos`, `uCameraRot`, `uResolution`, `uTime`, `uFov`), raymarch loop (100 шагов), слот `sceneSDF`
- [x] Тестовая сцена: сфера
- [x] **Adaptive resolution (базовая):** рендер в `WebGLRenderTarget` (фиксированный scale 0.5×), upscale на экран. Автоматический подбор scale по FPS — в фазе 6.

### Решения и замечания (4.1)

- **Uniform `uCameraDir` заменён на `uCameraRot` (mat3).** Вместо отдельного вектора направления передаём полную 3×3 матрицу вращения камеры (`setFromMatrix4(camera.matrixWorld)`). Это позволяет корректно трансформировать лучи из экранных координат в мировые при произвольном обзоре.
- **`uFov` как uniform.** FOV передаётся как uniform, а не захардкожен в шейдере, чтобы соответствовать PerspectiveCamera Three.js (75°) и при необходимости легко меняться.
- **Архитектура рендеринга:** добавлен `Engine.setRenderOverride()` — при нахождении в комнате основной `renderer.render(scene, camera)` заменяется на рендер комнаты. Это чище, чем добавлять fullscreen quad в основную сцену (которая бы конфликтовала с освещением и Z-буфером коридоров).
- **Blit-пас через отдельную сцену.** Render target рисуется на отдельный fullscreen quad с простым текстурным шейдером (не MeshBasicMaterial) — исключает влияние Three.js lighting/color management на выходную картинку.
- **Fallback при ошибке компиляции:** используется простая сфера-градиент (`FALLBACK_GRADIENT_SDF`). Ошибка сохраняется в `RoomRenderer.lastError`.
- **Проверка компиляции:** используется `renderer.compile()` для принудительной компиляции шейдера до первого кадра. Проверяется WebGL error state и program diagnostics.
- **DEV-тестирование:** временная клавиша T в `main.ts` переключает corridor ↔ room для визуальной проверки шаблона. Будет заменена полноценной интеграцией в 4.2.

## 4.2 Интеграция коридор ↔ комната ✅

- [x] Дверной проём (~1.5 м) в стене коридора ячейки (выбор стены по hash)
- [x] Триггер-зона AABB перед дверью: пересечение → `isInRoom = true`
- [x] `isInRoom`: скрыть коридор, показать fullscreen quad
- [x] Координатный мост: `shaderCameraPos = playerWorldPos − roomWorldCenter`
- [x] Выход: позиция за пределами проёма → `isInRoom = false`, обратно в коридор
- [x] Коллизия внутри: bounds box 4×4×2.5 м

### Решения и замечания (4.2)

- **Room walls как отдельный модуль (`door-builder.ts`).** Стены комнат (4 стены вокруг room boundary 4×4 м) отделены от corridor-builder, т.к. коридорные стены = maze walls, а комнатные стены = внутренние стены ячейки.
- **Door placement algorithm:** из всех открытых проходов (убранных maze walls) ячейки выбирается один через `roomHash(GEN_VERSION, globalSeed, floor, x, z) % openSides.length`. Дверь ставится в room wall, обращённую к этому проходу.
- **Trigger zone:** тонкая AABB (0.6 м в глубину) с внешней стороны двери. Срабатывает при пересечении с player bbox (0.4×1.7×0.4 м). После срабатывания игрок мгновенно переносится в room-local space.
- **Room collision с door exception:** в комнате игрок ограничен bounds ±2m, но на оси двери допускается мягкий выход до ±2.5 м (softLimit) через door gap. Это позволяет выйти из комнаты.
- **Exit detection:** порог HALF_ROOM + 0.3 м. Когда игрок пересекает его по оси двери → конвертация обратно в world space → corridor mode.
- **FloorManager расширен:** принимает Engine, RoomRenderer, StateMachine. Управляет полным жизненным циклом corridor ↔ room.
- **Room wall color:** `0xa09880` (чуть темнее коридорных стен `0xb0a890`) для визуального отличия.

## 4.3 Один примитив ✅

- [x] Room_ID = hash(version, globalSeed, floor, x, z)
- [x] Генератор: один примитив (sphere / box / cylinder) по Room_ID из PRNG
- [x] Параметры (радиус, размер, позиция) из PRNG с guardrails (см. SHADER_PIPELINE)
- [x] Вставка в слот `sceneSDF` шаблона
- [x] Fallback при ошибке компиляции — gradient shader

### Решения и замечания (4.3)

- **Полный pipeline в одном вызове:** `generateRoomShader(roomId, floor)` = `generateSDF()` → AST → `compileToGLSL()` → GLSL string. Вставляется в шаблон через `buildFragmentShader()`.
- **Tier system уже заложен:** `getTierConfig(floor)` определяет доступные примитивы, combiners, модификаторы и глубину дерева для каждого диапазона этажей. На этажах 6–20 — только sphere/box/cylinder, глубина 1–2.
- **Параметры guardrails** по спецификации: sphere radius [0.1, 2.0], box size [0.1, 2.0], cylinder r [0.1, 1.5], h [0.2, 2.5], torus R [0.2, 1.0], r [0.05, 0.5].
- **randomCenter:** смещение центра примитива: ±0.75 м по XZ, 0..1.2 м по Y. Не совпадает с центром комнаты — создаёт разнообразие.
- **Реализовано сразу с учётом 4.4–4.5:** AST-генератор уже поддерживает combiners и модификаторы, включение зависит от tier. Codegen компилирует всё дерево.

## 4.4 Комбинации ✅

- [x] AST-генератор: дерево глубины 2 (`combine(A, B)`)
- [x] Combiners: `min` (union), `max` (intersection), `smoothMin` (blend), `max(a,-b)` (subtraction)
- [x] Компилятор: AST → строка GLSL

### Решения и замечания (4.4)

- **4 типа операций:** union (min), intersection (max), subtraction (max(a,-b)), smoothUnion (smin). smoothUnion с k=[0.2, 0.8] из PRNG — создаёт органичные слияния форм.
- **Вероятность выбора:** при depth > 1 — 60% шанс combiner, 25% modifier, 15% примитив. Это даёт хорошее соотношение сложных и простых комнат.

## 4.5 Модификаторы ✅

- [x] Узлы: `twist`, `bend`, `repeat`
- [x] Параметры из PRNG с guardrails (twist/bend: ±π, repeat: period 0.5–4.0)

### Решения и замечания (4.5)

- **Модификаторы как функции vec3→vec3** в GLSL (не out-параметры). Это позволяет компоновать в одно выражение без промежуточных переменных: `sdBox(opTwist(p, 1.5) - center, size)`.
- **opRepeat:** `mod(p + 0.5*period, period) - 0.5*period` — стандартная domain repetition. Period clamp [0.5, 4.0] по каждой оси.
- **Доступность по тирам:** twist доступен с этажа 21, bend/repeat — с 51. На этажах 6–20 модификаторов нет.

## 4.6 Валидация и retry ✅

### 4.6a Валидация

- [x] Offscreen рендер в `WebGLRenderTarget(16×16)`
- [x] Синхронное чтение пикселей (`readRenderTargetPixels`). Async PBO — фаза 6.
- [x] Оценка средней яркости и variance

### 4.6b Retry-логика

- [x] Чёрный экран: яркость < 0.02 AND variance < 0.001
- [x] При провале: Room_ID + salt, до 5 попыток
- [x] При полном провале: ячейка → `"empty"` (не даёт войти)
- [x] Результат → `Map<"x,z", "valid" | "empty">` на этаж (FloorRoomCache)

### Решения и замечания (4.6)

- **Синхронный readback в Phase 4.** `readRenderTargetPixels` блокирует на ~1 мс для 16×16 буфера. Async PBO отложен до фазы 6, т.к. для текущих объёмов (1 валидация при входе) задержка незаметна.
- **Камера валидации:** фиксирована в (0, 1.2, 2.5), смотрит на центр комнаты. Это «взгляд от двери» — если отсюда видно чёрный экран, то и игрок увидит то же.
- **FloorRoomCache как per-floor Map.** Создаётся при загрузке этажа, очищается при выгрузке. Кэширует и 'valid', и 'empty' — повторной генерации нет.
- **Retry с salt:** `roomId + salt` (salt = 0..4). Каждый salt даёт новый seed → новое дерево. 5 попыток = 5 разных шейдеров.
- **Time-slicing отложен.** Валидация выполняется синхронно в момент подхода к двери. При будущей предгенерации (Phase 6) нужен time-slicing.

## 4.7 Нормализация SDF ✅

- [x] Bounding-оценка дерева → смещение к (0, 0, 0)
- [x] Масштабирование: объект вписывается в сферу ~1.5 м
- [x] Ограничение пропорций примитивов (нет плоских дисков и игл)

### Решения и замечания (4.7)

- **Статическая оценка bounds по AST.** Не рендерим для определения размера — вычисляем из параметров примитивов рекурсивно. Для комбинаций: union берёт outer hull, intersection — inner hull. Модификаторы (twist/bend/repeat) увеличивают оценку на 30% (inflate = 1.3).
- **Порядок нормализации:** 1) clampAspectRatios → 2) estimateBounds → 3) shiftCenter → 4) scale. Aspect ratio проверяется первым, чтобы bounds-оценка была корректной.
- **MAX_ASPECT_RATIO = 4.0** для box и cylinder. Предотвращает «иглы» и «диски».
- **Не масштабирует вверх.** Если объект уже ≤ 1.5 м — оставляем как есть. Маленькие объекты (0.1–0.3 м) допустимы — они выглядят интересно в пустой комнате.
- **Plane нормализуется условно** — его bounds зафиксированы как ±2 м (т.к. plane бесконечен, но визуально ограничен комнатой).

---

**MVP (Definition of Done):**

- [x] Иду по коридору → захожу через проём → вижу процедурную фигуру → выхожу обратно
- [x] Разные комнаты — разные фигуры (sphere, box, cylinder, комбинации, twist)
- [x] Нет чёрных комнат: либо рабочий шейдер, либо глухая стена
- [x] Объекты вписываются в комнату, расположены по центру
