# Determinism Contract

Этот документ описывает контракты, обеспечивающие концепцию «Цифрового монумента» (детерминированного мира).

## 1. Seed and PRNG Contract

### Hash Function

- **Строка → число:** `mulberry32`. Seed string (UTF-8) → `globalSeed` через детерминированный hash.
- Реализация: последовательное применение mulberry32 по байтам строки, финальное состояние — `globalSeed`.
- Все процедурные ветки используют PRNG, инициализированный от `globalSeed`.

### Seed Source

- `seedSource` priority:
  1. query param `?seed=...`
  2. value from start screen input
  3. last session seed from localStorage
  4. default `"official"`

## 2. Room Identity

- `Room_ID = hash(version, globalSeed, floor, gridX, gridZ)`.
- `version` included to isolate incompatible grammar upgrades.

## See Also

- [TECH_SPEC.md](TECH_SPEC.md) — основной свод технических контрактов
- [ADR/0002-determinism-contract.md](ADR/0002-determinism-contract.md)
