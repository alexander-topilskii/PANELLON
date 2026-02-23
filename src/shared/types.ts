/**
 * Runtime state machine states.
 * See ARCHITECTURE.md — core state machine.
 */
export type AppState = 'boot' | 'menu' | 'corridor' | 'room' | 'transition' | 'error';
