# Фаза 5 — Качество контента [M4]

RTD [✅]

**Цель:** Оживить мир — превью в дверях, продвинутые эффекты (фракталы, шум) на высоких этажах, ощущение «подъёма в безумие».

**Ключевые документы:**

- [../SHADER_PIPELINE.md](../SHADER_PIPELINE.md) §3 — tier constraints по этажам, node families (noise, fractal, animation)
- [../ADR/0004-room-generation-and-validation.md](../ADR/0004-room-generation-and-validation.md) — parameter guardrails для новых примитивов
- [../ADR/0006-performance-policy.md](../ADR/0006-performance-policy.md) — perf caps для сложных шейдеров
- [../PERFORMANCE_BUDGET.md](../PERFORMANCE_BUDGET.md) — frame budget, memory budget, adaptive resolution
- [../RISK_REGISTER.md](../RISK_REGISTER.md) R1 (GPU variability), R2 (compile stalls)

---

## 5.1 Превью-текстуры ✅

- [x] `PreviewRenderer` (`src/render/preview-renderer.ts`): компилирует SDF в шейдер, рендерит один кадр в 64×64 `WebGLRenderTarget`
- [x] Камера превью: 1.5 м внутрь от двери (на уровне глаз 1.25 м), смотрит на центр комнаты
- [x] Результат → текстура на `PlaneGeometry` в проёме двери (поле `previewPlane` в `DoorInfo`)
- [x] Lazy-генерация: при приближении игрока (≤ 2 ячейки = 12 м от проёма)
- [x] Лимит: не более 2 compile за кадр (`MAX_PREVIEWS_PER_FRAME = 2`)
- [x] Пустые ячейки: нет двери, нет превью
- [x] RT диспозится при unload этажа

**Принятые решения:**
- Отдельный `WebGLRenderTarget` на каждый превью (не пул с readback). При 64×64 RGBA это ~16 КБ на превью; даже 200 превью = 3.2 МБ — приемлемо. Позволяет избежать CPU readback (`readRenderTargetPixels`).
- Plane создаётся в `buildRoomWalls` одновременно с дверью — `visible = false` до загрузки текстуры.
- Камера реконструирует rotation matrix из direction vector (eye → center), без Three.js Camera.

## 5.2 Зона 21–50 (Усложнение) ✅

- [x] Новые примитивы: `plane`, `torus` (были доступны в tier config, теперь используются в грамматике на этих этажах)
- [x] Шум: `displace(child, amplitude, frequency)` — noise3D displacement. GLSL helper: value noise на mod-хеше (без texture lookup)
- [x] Анимация: `rotateY(child, speed)` — вращение вокруг Y по uTime
- [x] Глубина AST: 2–3

**Принятые решения:**
- `noise3D` реализован как 3D value noise через permutation-хеш (`mod((x*34+1)*x, 289)`), без текстур. Дёшево, гладко, детерминированно.
- `rotateY` — чистая трансформация `p` (mat2 rotation по XZ), не модификация `d`. Скорость 0.3–1.8 рад/с.
- `displace` добавляет `amplitude * noise3D(p * frequency)` к distance, создавая поверхностное искажение.

## 5.3 Зона 51–150 (Фракталы) ✅

- [x] `fbmDisplace`: fractional brownian motion — octaved noise для более «грязных» поверхностей. 2–4 октавы, затухание 0.5.
- [x] `fractalRepeat`: periodic repetition child SDF через `opRepeat`, масштабированный по iterations. Создаёт кристаллические решётки.
- [x] Анимация: `pulse(child, amplitude, frequency)` — синусоидальное смещение distance, `slide(child, axis, amp, freq)` — осциллирующий сдвиг позиции по одной оси.
- [x] Глубина AST: 3–4

**Принятые решения:**
- `fbm` использует loop `for (int i = 0; i < 8; i++) { if (i >= octaves) break; }` для обхода GLSL ограничения на non-constant loops в WebGL2.
- `fractalRepeat` реализован через `opRepeat + scale`, а не через отдельную рекурсивную GLSL функцию. Проще, надёжнее при компиляции.
- `slide` сдвигает `p` до вычисления child SDF — это transform, не post-process.

## 5.4 Зона 151+ (Математические галлюцинации) ✅

- [x] Фракталы: `menger(center, size, iterations)` — Menger sponge через iterative cross-section. `sierpinski(center, scale, iterations)` — тетраэдральный фрактал.
- [x] Морфинг: `morph(a, b, frequency)` — `mix(sdf_a, sdf_b, 0.5 + 0.5*sin(t))`. Плавный переход между двумя формами.
- [x] Цвет: HSV-градиенты по позиции (`atan(n.x,n.z)`, `length(p.xz)`, `dot(p,n)`) + пульсация hue от uTime. Tier-зависимая насыщенность.
- [x] Глубина AST: 4–8

**Принятые решения:**
- `menger` и `sierpinski` — stand-alone primitives (не modifier на child), т.к. их SDF-структура самодостаточна. До 6 итераций Menger, до 8 итераций Sierpinski.
- Цветовая модель вынесена в shader template (`ROOM_FRAG_SUFFIX`), а не в codegen. Управляется двумя uniform: `uColorSeed` (hue offset, 0–1 из roomHash) и `uTier` (1–4). Tier 1 = бежевый монохром, Tier 4 = полноцветный HSV с анимацией.
- `hsv2rgb` helper добавлен в prefix шаблона — всегда доступен.

---

## Архитектура грамматики после Phase 5

### Категории нод

| Семейство  | Ноды                                         | Появление    |
| ---------- | -------------------------------------------- | ------------ |
| Primitives | sphere, box, cylinder, torus, plane          | Этаж 6+      |
| Combiners  | union, intersection, subtraction, smoothUnion| Этаж 6+      |
| Modifiers  | twist, bend, repeat                          | Этаж 21+     |
| Noise      | displace, fbmDisplace                        | Этаж 21+     |
| Fractals   | fractalRepeat, menger, sierpinski            | Этаж 51+/151+|
| Animation  | rotateY, pulse, slide, morph                 | Этаж 21+     |

### Вероятности выбора категории (buildNode, depth ≥ 2)

| Категория  | Вероятность | Условие              |
| ---------- | ----------- | -------------------- |
| Combiner   | 45%         | Всегда               |
| Modifier   | 15%         | Если tier.modifiers   |
| Noise      | 12%         | Если tier.noise       |
| Animation  | 12%         | Если tier.animations  |
| Fractal    | 10%         | Если tier.fractals    |
| Leaf       | остаток     | Fallback              |

Leaf-ноды (примитивы) могут быть дополнительно обёрнуты в animation (25% шанс) или noise (15% шанс) через `maybeWrapLeaf`.

### GLSL helpers

Все helpers хранятся в `HELPER_FUNCTIONS` (codegen.ts) и включаются в output только при использовании (Set-based tracking).

| Helper       | Назначение                            |
| ------------ | ------------------------------------- |
| sdBox        | Box SDF                               |
| sdCylinder   | Cylinder SDF                          |
| sdTorus      | Torus SDF                             |
| smin         | Smooth minimum                        |
| opTwist      | Twist transform                       |
| opBend       | Bend transform                        |
| opRepeat     | Periodic repetition                   |
| noise3D      | 3D value noise                        |
| fbm          | Fractional Brownian Motion            |
| opRotateY    | Y-axis rotation (animated)            |
| sdMenger     | Menger sponge (iterative)             |
| sdSierpinski | Sierpinski tetrahedron (iterative)    |
| hsv2rgb      | HSV→RGB conversion (in template)      |

---

## Файлы (изменённые/новые)

| Файл                              | Изменение                                              |
| --------------------------------- | ------------------------------------------------------ |
| `src/render/preview-renderer.ts`  | **Новый.** Offscreen render 64×64 для превью            |
| `src/render/door-builder.ts`      | `DoorInfo.previewPlane`, `createPreviewPlane()`          |
| `src/core/floor-manager.ts`       | Preview lifecycle, color params, `floorToTier()`         |
| `src/shader-gen/types.ts`         | Noise/Fractal/Animation node types, expanded TierConfig  |
| `src/shader-gen/generator.ts`     | buildNoiseNode, buildAnimNode, buildFractalNode, maybeWrapLeaf |
| `src/shader-gen/codegen.ts`       | GLSL emission для всех новых нод, noise3D/fbm/menger/etc helpers |
| `src/shader-gen/normalize.ts`     | Bounds estimation + scaling для новых нод                |
| `src/shader-gen/template.ts`      | HSV color system (uColorSeed, uTier), hsv2rgb helper    |
| `src/shader-gen/validator.ts`     | uColorSeed/uTier uniforms                               |
| `src/render/room-renderer.ts`     | setRoomParams(), uColorSeed/uTier uniforms               |

---

**MVP (Definition of Done):**

- [x] В дверях коридоров видны миниатюры (64×64) содержимого комнат
- [x] Этаж 25: вращающиеся искажённые формы (rotateY + displace)
- [x] Этаж 80: фрактальные повторения (fractalRepeat + fbmDisplace)
- [x] Этаж 200: цветные фракталы, морфинг (menger/sierpinski + morph + HSV)
- [x] Performance: max 2 compile per frame, lazy по proximity, adaptive resolution
