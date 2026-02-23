/**
 * Thin wrapper around performance timing for the game loop.
 * Provides delta time (seconds) clamped to avoid spiral-of-death on tab switch.
 */
const MAX_DELTA = 1 / 15; // cap at ~66ms to prevent physics explosions after tab-away

export class Clock {
  private last = -1;
  delta = 0;
  elapsed = 0;

  tick(now: DOMHighResTimeStamp): void {
    if (this.last < 0) {
      this.last = now;
      this.delta = 0;
      return;
    }
    const raw = (now - this.last) / 1000;
    this.delta = Math.min(raw, MAX_DELTA);
    this.elapsed += this.delta;
    this.last = now;
  }
}
