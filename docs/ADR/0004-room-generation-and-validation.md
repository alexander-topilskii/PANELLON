# ADR 0004: Room Generation and Validation

- Status: Accepted
- Date: 2026-02-22

## Context

Грамматическая генерация может давать невалидные или визуально пустые шейдеры.

## Decision

- Генерация комнаты идет через AST grammar -> GLSL codegen.
- На room enter используется pipeline compile + validate.
- Retry cap: `20`.
- После исчерпания ретраев ячейка помечается `empty`.
- Используется fallback shader для compile failure.

## Consequences

Плюсы:

- стабильный UX без "навсегда черных" комнат;
- предсказуемые временные границы.

Минусы:

- часть ячеек может быть недоступной как контент;
- нужен аккуратный баланс между strict validation и творческой вариативностью.
