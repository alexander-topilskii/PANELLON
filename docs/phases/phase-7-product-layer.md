# Фаза 7 — Продуктовый слой [M6]

RTD [+]

**Цель:** Довести до полноценного цифрового продукта-монумента. Сохранение прогресса, архив находок, предгенерация, финальная полировка.

**Ключевые документы:**

- [../DATA_MODEL.md](../DATA_MODEL.md) — localStorage keys (`panellon.seed`, `.floor`, `.position`), archive store
- [../UX_FLOWS.md](../UX_FLOWS.md) §4 (pause/settings), §5 (archive flow)
- [../ADR/0005-storage-and-versioning.md](../ADR/0005-storage-and-versioning.md) — versioning, migration strategy
- [../TECH_SPEC.md](../TECH_SPEC.md) §5 (versioning), §6 (failure modes: WebGL fallback, quota)
- [../TEST_PLAN.md](../TEST_PLAN.md) §6 — release gate (v1)
- [../RISK_REGISTER.md](../RISK_REGISTER.md) R4 (quota), R5 (scope creep)

---

## 7.1 Сохранение позиции (Resume)

- [ ] localStorage: `panellon.seed`, `panellon.floor`, `panellon.position` (JSON `{x, z}`), `panellon.version`
- [ ] Автосохранение: при переходе между этажами + периодически (каждые N секунд)
- [ ] При загрузке: URL `?seed=...` → новый старт с этажа 0; иначе → localStorage → resume
- [ ] Стартовый экран: кнопка «Продолжить (Seed: XY, Этаж N)» при наличии сохранения

## 7.2 Полировка (Архив и меню)

- [ ] Кнопка «Заархивировать» в режиме комнаты → IndexedDB store `archive` (шейдер + метаданные)
- [ ] Меню по Escape: seed, номер этажа, лимит кэша, список архива
- [ ] Клик по элементу архива → телепорт в комнату

## 7.3 Fallbacks и UX

- [ ] **WebGL fallback:** `WebGL.isWebGL2Available()` → при отсутствии — экран с сообщением
- [ ] **Версионирование кэша:** константа `GEN_VERSION`; при смене грамматики — инкремент → старый кэш игнорируется, архив сохраняется
- [ ] **Многоуровневая предгенерация (prewarm):** 
  - При входе на этаж: фоновая генерация AST и сохранение GLSL-строк в IndexedDB в радиусе **10 ячеек** (только CPU-нагрузка).
  - При приближении игрока: компиляция шейдеров (`ShaderMaterial`) и превью только в радиусе **2-3 ячеек** (чтобы не превышать лимит по памяти и FPS-бюджет 1-2 компиляции/кадр).

---

**MVP (Definition of Done):**

- [ ] Закрыл вкладку на 12 этаже → открыл → «Продолжить» → на месте
- [ ] Нашёл красивую комнату → «Заархивировать» → в меню видна, можно вернуться
- [ ] WebGL2 отсутствует → понятное сообщение (не белый экран)
- [ ] Готовый к публикации MVP
