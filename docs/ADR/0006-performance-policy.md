# ADR 0006: Performance Policy

- Status: Accepted
- Date: 2026-02-22

## Context

Сложные процедурные шейдеры и большие этажи могут быстро ломать интерактивность.

## Decision

- Ввести performance budget и release gates.
- Использовать adaptive resolution для room raymarch.
- Ввести обязательные soak/perf проверки для изменений генерации и рендера.

## Consequences

Плюсы:

- производительность становится контрактом, а не пожеланием;
- проще останавливать деградации на ранней стадии.

Минусы:

- замедляет скорость feature delivery из-за обязательных измерений.
