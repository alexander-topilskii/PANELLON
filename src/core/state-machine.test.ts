import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from './state-machine';

describe('StateMachine', () => {
  it('starts in boot state', () => {
    const sm = new StateMachine();
    expect(sm.state).toBe('boot');
  });

  it('transitions boot → menu → corridor', () => {
    const sm = new StateMachine();
    sm.transition('menu');
    expect(sm.state).toBe('menu');
    sm.transition('corridor');
    expect(sm.state).toBe('corridor');
  });

  it('throws on invalid transition', () => {
    const sm = new StateMachine();
    expect(() => sm.transition('corridor')).toThrow('Invalid state transition');
  });

  it('notifies listeners on transition', () => {
    const sm = new StateMachine();
    const listener = vi.fn();
    sm.onTransition(listener);
    sm.transition('menu');
    expect(listener).toHaveBeenCalledWith('boot', 'menu');
  });

  it('allows transition to error from any state', () => {
    const sm = new StateMachine();
    sm.transition('menu');
    sm.transition('error');
    expect(sm.state).toBe('error');
  });
});
