# PANELLON Docs Index

Этот каталог содержит рабочую документацию перед и во время реализации.

## Матрица соответствия планов

| plan.md (фаза.этап) | ROADMAP |
|----------------------|---------|
| 0.1, 0.2, 0.3        | M0      |
| 1.1, 1.2             | M0      |
| 2.1, 2.2             | M1      |
| 3.1, 3.2, 3.3        | M2      |
| 4.1–4.7              | M3      |
| 5.1–5.4              | M4      |
| 6.1–6.3              | M5      |
| 7.1, 7.2             | M6      |

Связанные верхнеуровневые документы:

- Продуктовое описание и vision: [../README.md](../README.md)
- Детальный поэтапный план: [../plan.md](../plan.md)
- Детальные планы по фазам: [phases/](phases/)
- Список закрытых вопросов: [../questions.md](../questions.md)

## Core

- [ARCHITECTURE.md](ARCHITECTURE.md) — границы модулей и их взаимодействие
- [TECH_SPEC.md](TECH_SPEC.md) — базовые технические контракты
- [DETERMINISM_CONTRACT.md](DETERMINISM_CONTRACT.md) — детерминизм и PRNG
- [WORLD_GENERATION.md](WORLD_GENERATION.md) — топология лабиринта и генерация чанков
- [ROADMAP.md](ROADMAP.md) — этапы реализации и Definition of Done

## Engineering

- [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md) — целевые лимиты и как мерить
- [TEST_PLAN.md](TEST_PLAN.md) — стратегия тестирования
- [RISK_REGISTER.md](RISK_REGISTER.md) — ключевые риски и меры снижения

## Domain

- [SHADER_PIPELINE.md](SHADER_PIPELINE.md) — правила грамматической генерации, пайплайн и валидация шейдеров
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
