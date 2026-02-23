# Фаза 0 — Project Setup & CI/CD [M0]

**Цель:** Подготовить инфраструктуру проекта, настроить сборку, автоматический деплой и базовый скелет приложения для дальнейшей разработки.

**Ключевые документы:**

- [../ARCHITECTURE.md](../ARCHITECTURE.md) — структура директорий (`src/core`, `input`, `world-gen`, …)
- [../ADR/0001-tech-stack-and-rendering.md](../ADR/0001-tech-stack-and-rendering.md) — выбор стека: Vite + Vanilla TS + Three.js
- [../TEST_PLAN.md](../TEST_PLAN.md) — стратегия тестирования (Vitest настраивается здесь)

---

## 0.1 Инициализация и зависимости

- [ ] Развернуть проект: `npm create vite@latest panellon -- --template vanilla-ts`
- [ ] Установить зависимости: `three`, `@types/three`
- [ ] Настроить TypeScript, ESLint, Prettier
- [ ] Настроить тестовый фреймворк (Vitest)
- [ ] Создать базовую файловую структуру согласно ARCHITECTURE.md (`src/core`, `input`, `world-gen`, `shader-gen`, `render`, `storage`, `ui`, `shared`)

## 0.2 Настройка CI/CD (GitHub Actions)

- [ ] Создать `.github/workflows/deploy.yml` (checkout → setup-node → install → build → upload-pages-artifact)
- [ ] Настроить проверки линтера и сборки при пушах в main

## 0.3 Базовый цикл приложения (App Shell)

- [ ] Настроить `index.html` и корневой `style.css` (fullscreen canvas: `100vw × 100vh`, без скроллов)
- [ ] Написать базовый Game Loop (`requestAnimationFrame`) с вызовом `render()`
- [ ] Вывести простейшую сцену (куб) для проверки конвейера

---

**MVP (Definition of Done):**

- [ ] Проект собирается без ошибок
- [ ] Авто-деплой на GitHub Pages работает (Action проходит)
- [ ] Локально и на GH Pages виден Three.js canvas с базовым рендером
- [ ] Vitest запускается (`npm test`)
