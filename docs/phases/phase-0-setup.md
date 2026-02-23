# Фаза 0 — Project Setup & CI/CD [M0]

RTD [+]

**Цель:** Подготовить инфраструктуру проекта, настроить сборку, автоматический деплой и базовый скелет приложения для дальнейшей разработки.

**Ключевые документы:**

- [../ARCHITECTURE.md](../ARCHITECTURE.md) — структура директорий (`src/core`, `input`, `world-gen`, …)
- [../ADR/0001-tech-stack-and-rendering.md](../ADR/0001-tech-stack-and-rendering.md) — выбор стека: Vite + Vanilla TS + Three.js
- [../TEST_PLAN.md](../TEST_PLAN.md) — стратегия тестирования (Vitest настраивается здесь)

---

## 0.1 Инициализация и зависимости

- [x] Развернуть проект: Vite + vanilla-ts (ручная инициализация, т.к. репозиторий уже содержал docs)
- [x] Установить зависимости: `three`, `@types/three`
- [x] Настроить TypeScript, ESLint, Prettier
- [x] Настроить тестовый фреймворк (Vitest)
- [x] Создать базовую файловую структуру согласно ARCHITECTURE.md (`src/core`, `input`, `world-gen`, `shader-gen`, `render`, `storage`, `ui`, `shared`)

## 0.2 Настройка CI/CD (GitHub Actions)

- [x] Создать `.github/workflows/deploy.yml` (checkout → setup-node → install → lint → test → build → upload-pages-artifact)
- [x] Настроить проверки линтера и сборки при пушах в main

## 0.3 Базовый цикл приложения (App Shell)

- [x] Настроить `index.html` и корневой `style.css` (fullscreen canvas: `100vw × 100vh`, без скроллов)
- [x] Написать базовый Game Loop (`requestAnimationFrame`) с вызовом `render()`
- [x] Вывести простейшую сцену (куб) для проверки конвейера

---

**MVP (Definition of Done):**

- [x] Проект собирается без ошибок
- [ ] Авто-деплой на GitHub Pages работает (Action проходит) — ожидает первого пуша в main
- [x] Локально виден Three.js canvas с базовым рендером (вращающийся куб)
- [x] Vitest запускается (`npm test`), 3/3 теста проходят

---

## Принятые решения (Phase 0)

| Вопрос | Решение | Обоснование |
|--------|---------|-------------|
| Инициализация проекта | Ручная настройка Vite (не шаблон `create vite`) | Репозиторий уже содержал документацию и git-историю; шаблон затёр бы файлы |
| ESLint конфигурация | Flat config (`eslint.config.js`) | ESLint v10 не поддерживает `.eslintrc.*`; миграция на новый формат обязательна |
| Структура `src/` | 8 модулей с placeholder `index.ts` | По ARCHITECTURE.md; модули заполняются в следующих фазах |
| Game Loop | Класс `Engine` + `Clock` | `Engine` владеет renderer/scene/camera и RAF loop; `Clock` — тонкая обёртка с delta-clamping (1/15 сек) для защиты от spiral-of-death после tab-away |
| Базовая сцена | Вращающийся куб со StandardMaterial + направленный свет | Минимальная проверка что Three.js pipeline работает |
| WebGL2 проверка | При загрузке, до создания renderer | Согласно TECH_SPEC §6: при отсутствии WebGL2 — экран с ошибкой |
| GitHub Pages base | `/PANELLON/` | Проект деплоится как project page, не user page |
| CI pipeline | lint → test → build → deploy | Deploy только при push в main; PR — только проверки |
