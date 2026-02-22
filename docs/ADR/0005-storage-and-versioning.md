# ADR 0005: Storage and Versioning

- Status: Accepted
- Date: 2026-02-22

## Context

Проекту нужен кэш генерации и пользовательский архив находок с безопасной эволюцией схемы.

## Decision

- Использовать localStorage для resume-метаданных.
- Использовать IndexedDB для `cache`, `archive`, `meta`.
- Cache key includes generation version: `v{version}:{seed}:{floor}:{x}:{z}`.
- При version mismatch кэш может сбрасываться; архив не удаляется автоматически.

## Consequences

Плюсы:

- быстрый повторный доступ к комнатам;
- контролируемая совместимость между версиями генератора.

Минусы:

- сложность миграций;
- квоты хранилища зависят от браузера.

## Related

- [../DATA_MODEL.md](../DATA_MODEL.md)
- [../TECH_SPEC.md](../TECH_SPEC.md)
- [../TEST_PLAN.md](../TEST_PLAN.md)
- [0002-determinism-contract.md](0002-determinism-contract.md)
