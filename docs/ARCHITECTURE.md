# Architecture

## Цель архитектуры

Разделить систему на независимые части так, чтобы:

- генерация мира была детерминированной и тестируемой;
- рендеринг и gameplay loop не зависели от деталей хранилища;
- можно было развивать контент без переписывания базового цикла.

## High-Level Components

1. `app/core`
   - bootstrapping SPA;
   - game loop;
   - runtime state machine (`boot`, `menu`, `corridor`, `room`, `transition`, `error`).

2. `app/input`
   - keyboard/mouse/pointer lock;
   - нормализованные команды движения и обзора.

3. `app/world-gen`
   - seed pipeline;
   - floor descriptor;
   - chunk topology generation (corridors, walls, door candidates, stairs placement).

4. `app/shader-gen`
   - Room_ID and PRNG;
   - grammar AST generation;
   - GLSL codegen;
   - validation and retry policy.

5. `app/render`
   - Three.js scene management for corridors;
   - room fullscreen raymarch pipeline;
   - adaptive resolution controller.

6. `app/storage`
   - localStorage (session/resume metadata);
   - IndexedDB (shader cache + archive + metadata).

7. `app/ui`
   - start screen;
   - HUD (`floor`, status);
   - pause/settings;
   - archive UI.

## Data Flow

1. Пользователь выбирает seed.
2. `world-gen` получает seed и floor, возвращает floor/chunk descriptors.
3. `render` строит corridor meshes только для активных чанков.
4. При входе в дверь `shader-gen` генерирует или достает из cache room shader.
5. `render` переключает режим corridor -> room.
6. `storage` сохраняет прогресс и кэширует результаты.

## Runtime Boundaries

- В памяти одновременно держим:
  - один активный floor runtime;
  - ограниченный набор активных чанков;
  - активный room shader только во время нахождения в комнате.
- При переходе между этажами: deterministic unload -> load sequence.

## Determinism Boundary

Гарантируется детерминизм для:

- topology descriptors;
- room generation decisions;
- storage keys and lookup rules.

Не гарантируется битовая идентичность финального изображения на разных GPU.

## Error Handling Model

- Shader compile error -> fallback shader.
- Validation failure after retry limit -> room marked as `empty`.
- Storage quota errors -> cache eviction strategy, archive remains read-only priority.
- WebGL unavailable -> dedicated error screen.

## Directory Proposal

```text
src/
  core/
  input/
  world-gen/
  shader-gen/
  render/
  storage/
  ui/
  shared/
```

## Non-Goals (v1)

- Multiplayer/sync between clients.
- Audio pipeline.
- Server-side gallery.
