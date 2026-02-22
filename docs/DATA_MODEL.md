# Data Model

## localStorage

Назначение: быстрый resume последней сессии.

Keys:

- `panellon.seed`: `string`
- `panellon.floor`: `number`
- `panellon.position`: JSON `{ x: number, y: number, z: number }`
- `panellon.version`: `number`

Rules:

- write on floor transition and periodic autosave;
- if parse/version mismatch, ignore and use defaults.

## IndexedDB

Database: `panellon`

### Store: `cache`

Key:

- `v{genVersion}:{seed}:{floor}:{x}:{z}`

Value:

- `status`: `valid | empty`
- `glsl`: `string | null`
- `meta`: JSON (tier, retryCount, timestamps)
- `bytesEstimate`: `number`

Indexes:

- `lastAccessAt`
- `status`

### Store: `archive`

Key:

- auto increment or stable hash id

Value:

- `seed`, `floor`, `x`, `z`
- `glsl`
- `createdAt`
- optional `thumb` (small preview image blob/string)

Archive is user-owned and not LRU-evicted by default.

### Store: `meta`

Records:

- `schemaVersion`
- `cacheBytesTotal`
- `lruState`

## Migration Strategy

- `schemaVersion` bump on structural DB changes.
- `genVersion` bump on grammar incompatibility.
- On migration failure:
  - cache may be dropped;
  - archive attempted to preserve.
