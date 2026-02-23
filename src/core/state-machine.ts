import type { AppState } from '@/shared/types';

type StateListener = (from: AppState, to: AppState) => void;

/**
 * Simple runtime state machine.
 * Valid transitions are enforced; invalid ones throw.
 */
export class StateMachine {
  private _state: AppState = 'boot';
  private listeners: StateListener[] = [];

  private static readonly VALID_TRANSITIONS: Record<AppState, AppState[]> = {
    boot: ['menu', 'error'],
    menu: ['corridor', 'error'],
    corridor: ['room', 'transition', 'menu', 'error'],
    room: ['corridor', 'error'],
    transition: ['corridor', 'error'],
    error: ['menu'],
  };

  get state(): AppState {
    return this._state;
  }

  transition(to: AppState): void {
    const allowed = StateMachine.VALID_TRANSITIONS[this._state];
    if (!allowed?.includes(to)) {
      throw new Error(`Invalid state transition: ${this._state} → ${to}`);
    }
    const from = this._state;
    this._state = to;
    for (const listener of this.listeners) {
      listener(from, to);
    }
  }

  onTransition(listener: StateListener): void {
    this.listeners.push(listener);
  }
}
