# Фаза 5 — Качество контента [M4]

RTD [+]

**Цель:** Оживить мир — превью в дверях, продвинутые эффекты (фракталы, шум) на высоких этажах, ощущение «подъёма в безумие».

**Ключевые документы:**

- [../SHADER_PIPELINE.md](../SHADER_PIPELINE.md) §3 — tier constraints по этажам, node families (noise, fractal, animation)
- [../ADR/0004-room-generation-and-validation.md](../ADR/0004-room-generation-and-validation.md) — parameter guardrails для новых примитивов
- [../ADR/0006-performance-policy.md](../ADR/0006-performance-policy.md) — perf caps для сложных шейдеров
- [../PERFORMANCE_BUDGET.md](../PERFORMANCE_BUDGET.md) — frame budget, memory budget, adaptive resolution
- [../RISK_REGISTER.md](../RISK_REGISTER.md) R1 (GPU variability), R2 (compile stalls)

---

## 5.1 Превью-текстуры

- [ ] Пул `WebGLRenderTarget(64×64)` для offscreen рендера
- [ ] Камера превью: 0.5 м внутрь от двери, смотрит на центр комнаты
- [ ] Результат → текстура на PlaneGeometry в проёме двери
- [ ] Lazy-генерация: при приближении игрока (≤ 2 ячейки от проёма)
- [ ] Лимит генераций за кадр (не более 1–2 compile за frame, чтобы избежать stalls)
- [ ] Пустые ячейки: нет двери, нет превью

## 5.2 Зона 21–50 (Усложнение)

- [ ] Новые примитивы: `plane`, `torus`
- [ ] Шум: `noise3D` (simplex/perlin в GLSL)
- [ ] Анимация: `rotate_y(expr, uTime)`
- [ ] Глубина AST: 2–3

## 5.3 Зона 51–150 (Фракталы)

- [ ] `fbm`, `displace(expr, noise)`, `fractal_repeat`
- [ ] Анимация: `pulse`, `slide`
- [ ] Глубина AST: 3–4

## 5.4 Зона 151+ (Математические галлюцинации)

- [ ] Фракталы: `menger`, `sierpinski`
- [ ] Морфинг: `morph(expr_a, expr_b, t)`
- [ ] Цвет: HSV-градиенты по позиции, пульсация hue от времени
- [ ] Глубина AST: 4–8

---

**MVP (Definition of Done):**

- [ ] В дверях коридоров видны миниатюры (64×64) содержимого комнат
- [ ] Этаж 25: вращающиеся искажённые формы
- [ ] Этаж 80: фрактальные повторения
- [ ] Этаж 200: цветные фракталы, морфинг
- [ ] Нет падений WebGL из-за слишком сложных шейдеров (performance budget)
