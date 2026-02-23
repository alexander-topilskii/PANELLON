# ADR 0003: Floor Generation and Chunking

- Status: Accepted (clarified by [ADR-0007](0007-maze-topology-and-chunking.md))
- Date: 2026-02-22

## Context

Полная генерация высоких этажей (по квадратичной формуле комнат) не масштабируется.

## Decision

- Для этажей `6+` использовать chunked lazy generation.
- Топология чанка детерминируется `(seed, floor, chunkX, chunkZ, version)`.
- Рендерить только активный радиус чанков вокруг игрока.

## Consequences

Плюсы:

- контролируемое использование CPU/GPU памяти;
- поддержка практически неограниченной высоты.

Минусы:

- усложнение генератора и boundary-согласования между чанками.

## Related

- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../TECH_SPEC.md](../TECH_SPEC.md)
- [../PERFORMANCE_BUDGET.md](../PERFORMANCE_BUDGET.md)
- [0002-determinism-contract.md](0002-determinism-contract.md)
