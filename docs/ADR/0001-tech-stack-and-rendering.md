# ADR 0001: Tech Stack and Rendering

- Status: Accepted
- Date: 2026-02-22

## Context

Проект должен работать как web SPA без установки и обеспечивать 3D-рендеринг коридоров и процедурных комнат.

## Decision

- Использовать `TypeScript` как основной язык.
- Использовать `Three.js` как рендер-слой.
- Коридоры рендерить мешами (scene graph).
- Комнаты рендерить fullscreen raymarch shader-проходом.

## Consequences

Плюсы:

- быстрый старт и развитая экосистема;
- гибридный pipeline хорошо соответствует задаче.

Минусы:

- сложнее поддерживать два рендер-режима;
- возможны ограничения WebGL на слабых устройствах.

## Related

- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../TECH_SPEC.md](../TECH_SPEC.md)
- [0006-performance-policy.md](0006-performance-policy.md)
