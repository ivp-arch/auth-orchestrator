/**
 * Framework-agnostic state store with observer pattern.
 * Adapters (React, Angular) bridge this to their native reactivity:
 * - React: useSyncExternalStore subscribes to this
 * - Angular: a Signal mirrors this state
 */
export type Listener<T> = (state: T) => void;
export type Unsubscribe = () => void;

export class StateStore<T> {
  private state: T;
  private readonly listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.state = initial;
  }

  getState(): T {
    return this.state;
  }

  setState(next: T): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
