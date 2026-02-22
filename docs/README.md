# PANELLON Docs Index

Этот каталог содержит рабочую документацию перед и во время реализации.

Связанные верхнеуровневые документы:

- Продуктовое описание и vision: [../README.md](../README.md)
- Детальный поэтапный план: [../plan.md](../plan.md)
- Список закрытых вопросов: [../questions.md](../questions.md)

## Core

- `ARCHITECTURE.md` — границы модулей и их взаимодействие
- `TECH_SPEC.md` — технические контракты и алгоритмы
- `ROADMAP.md` — этапы реализации и Definition of Done

## Engineering

- `PERFORMANCE_BUDGET.md` — целевые лимиты и как мерить
- `TEST_PLAN.md` — стратегия тестирования
- `RISK_REGISTER.md` — ключевые риски и меры снижения

## Domain

- `SHADER_GRAMMAR.md` — правила грамматической генерации шейдеров
- `DATA_MODEL.md` — схемы localStorage и IndexedDB
- `UX_FLOWS.md` — пользовательские сценарии и состояния

## Decisions

- `ADR/` — архитектурные решения (Architecture Decision Records)

## Workflow

1. Любое новое значимое решение сначала фиксируется в `ADR`.
2. После ADR синхронизируются `ARCHITECTURE.md` и/или `TECH_SPEC.md`.
3. Если решение влияет на производительность, обновляется `PERFORMANCE_BUDGET.md`.
4. Если решение влияет на поведение, обновляется `TEST_PLAN.md` и `UX_FLOWS.md`.
