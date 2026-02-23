import { DEFAULT_SEED } from './constants';
import { stringToSeed } from './hash';

/**
 * Resolves effective seed string by priority (DETERMINISM_CONTRACT §1):
 * 1. URL query param `?seed=...`
 * 2. Explicit input value
 * 3. localStorage `panellon.seed`
 * 4. Default "official"
 */
export function resolveSeed(inputValue?: string): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('seed');
  if (fromUrl && fromUrl.trim().length > 0) return fromUrl.trim();

  if (inputValue && inputValue.trim().length > 0) return inputValue.trim();

  const stored = localStorage.getItem('panellon.seed');
  if (stored && stored.trim().length > 0) return stored.trim();

  return DEFAULT_SEED;
}

/**
 * Persists seed to localStorage for session restore.
 */
export function persistSeed(seed: string): void {
  localStorage.setItem('panellon.seed', seed);
}

/**
 * Converts resolved seed string into numeric globalSeed.
 */
export function seedToGlobal(seed: string): number {
  return stringToSeed(seed);
}
