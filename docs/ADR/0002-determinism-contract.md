# ADR 0002: Determinism Contract

- Status: Accepted
- Date: 2026-02-22

## Context

Ключевая ценность проекта — воспроизводимость мира по seed.

## Decision

Детерминизм обязателен для:

- floor/chunk descriptors;
- Room_ID and grammar choices;
- cache keys and status outcomes.

Гарантия не распространяется на битовую идентичность финального изображения на разных GPU/драйверах.

## Consequences

Плюсы:

- четкий проверяемый контракт;
- проще писать regression tests.

Минусы:

- дополнительная дисциплина versioning;
- ограничение на "случайные" runtime-ветки логики.
