# Фаза 0 — Project Setup & CI/CD

**Цель:** Подготовить инфраструктуру проекта, настроить сборку, автоматический деплой и базовый скелет приложения для дальнейшей разработки.

## 0.1 Инициализация и зависимости
**Что делаем:**
- Разворачиваем проект на базе Vite (Vanilla TS или React/Vue по выбору, но согласно концепции — SPA без тяжелых фреймворков, Vanilla TS предпочтительнее для максимального контроля над Three.js).
- Устанавливаем `three.js`.
- Настраиваем TypeScript, ESLint, Prettier, чтобы фиксировать качество кода с самого старта.
- Создаем базовую файловую структуру согласно `ARCHITECTURE.md` (папки `core`, `input`, `world-gen`, `shader-gen`, `render`, `storage`, `ui`).

**Детали реализации:**
- `npm create vite@latest panellon -- --template vanilla-ts`
- `npm install three`
- `npm install -D @types/three typescript eslint prettier`

## 0.2 Настройка CI/CD (GitHub Actions)
**Что делаем:**
- Создаем Workflow для автоматического деплоя на GitHub Pages.
- Настраиваем проверки (линтер и сборка) при пуллах и пушах в main.

**Детали реализации:**
- Создаем `.github/workflows/deploy.yml` с использованием `actions/checkout`, `actions/setup-node`, `npm install`, `npm run build` и `actions/upload-pages-artifact`.
- Это гарантирует, что каждая новая версия "цифрового монумента" сразу доступна по публичной ссылке для тестирования на разных устройствах.

## 0.3 Базовый цикл приложения (App Shell)
**Что делаем:**
- Настраиваем `index.html` и корневой `style.css` (убираем скроллы, делаем canvas `width: 100vw; height: 100vh; block`).
- Пишем базовый Game Loop (`requestAnimationFrame`), который будет вызывать метод `render()` для Three.js.
- Добавляем простейшую сцену с кубиком для проверки работоспособности конвейера.

**MVP (Definition of Done):**
- Проект собирается без ошибок.
- Настроен авто-деплой в GitHub Pages (Action проходит успешно).
- При открытии локально и на GH Pages виден Three.js canvas с базовым рендером.