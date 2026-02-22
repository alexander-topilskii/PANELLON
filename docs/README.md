# PANELLON Docs Index

Этот каталог содержит рабочую документацию перед и во время реализации.

## Матрица соответствия планов

| plan.md | README этап | ROADMAP |
|---------|-------------|---------|
| 1, 2a | 0 | M0 |
| 5c, 5b | 1 | M1 |
| 2b, 5a, 5d | 2 | M2 |
| 3a, 3b, 4a–4e | 3, 4 | M3, M4 |
| 6, 7a–7c | 4 | M4 |
| 8a, 9a–9b | 5 | M5 |
| 8b, 10 | 6 | M6 |

Связанные верхнеуровневые документы:

- Продуктовое описание и vision: [../README.md](../README.md)
- Детальный поэтапный план: [../plan.md](../plan.md)
- Список закрытых вопросов: [../questions.md](../questions.md)

## Core

- [ARCHITECTURE.md](ARCHITECTURE.md) — границы модулей и их взаимодействие
- [TECH_SPEC.md](TECH_SPEC.md) — технические контракты и алгоритмы
- [ROADMAP.md](ROADMAP.md) — этапы реализации и Definition of Done

## Engineering

- [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md) — целевые лимиты и как мерить
- [TEST_PLAN.md](TEST_PLAN.md) — стратегия тестирования
- [RISK_REGISTER.md](RISK_REGISTER.md) — ключевые риски и меры снижения

## Domain

- [SHADER_GRAMMAR.md](SHADER_GRAMMAR.md) — правила грамматической генерации шейдеров
- [DATA_MODEL.md](DATA_MODEL.md) — схемы localStorage и IndexedDB
- [UX_FLOWS.md](UX_FLOWS.md) — пользовательские сценарии и состояния

## Decisions

- [ADR/](ADR/) — архитектурные решения (Architecture Decision Records)
- [DOC_REVIEW.md](DOC_REVIEW.md) — обзор полноты документации, чек-лист перед стартом

## Workflow

1. Любое новое значимое решение сначала фиксируется в [ADR](ADR/).
2. После ADR синхронизируются [ARCHITECTURE.md](ARCHITECTURE.md) и/или [TECH_SPEC.md](TECH_SPEC.md).
3. Если решение влияет на производительность, обновляется [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md).
4. Если решение влияет на поведение, обновляется [TEST_PLAN.md](TEST_PLAN.md) и [UX_FLOWS.md](UX_FLOWS.md).
