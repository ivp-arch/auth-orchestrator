import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, StateError } from '../../src/errors';
import {
  FLOW_STATE_TTL_MS,
  FlowStateStorage,
  isFlowStateFresh,
  type SignInFlowState,
} from '../../src/flows/flow-state';

function makeFlow(overrides?: Partial<SignInFlowState>): SignInFlowState {
  return {
    codeVerifier: 'v'.repeat(43),
    state: 'state-value',
    nonce: 'nonce-value',
    redirectUri: 'https://app.example.com/auth/callback',
    createdAt: 1_000,
    ...overrides,
  };
}

describe('FlowStateStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('round-trips a saved flow', () => {
    const storage = new FlowStateStorage();
    const flow = makeFlow();
    storage.save(flow);
    expect(storage.load()).toEqual(flow);
  });

  it('returns null when nothing was saved', () => {
    expect(new FlowStateStorage().load()).toBeNull();
  });

  it('clears a saved flow', () => {
    const storage = new FlowStateStorage();
    storage.save(makeFlow());
    storage.clear();
    expect(storage.load()).toBeNull();
  });

  it('rejects load with ERR_FLOW_STATE when the payload is corrupted', () => {
    expect.hasAssertions();
    sessionStorage.setItem('auth-orchestrator:flow', '{not json');
    try {
      new FlowStateStorage().load();
    } catch (error) {
      expect(error).toBeInstanceOf(StateError);
      expect((error as StateError).code).toBe('ERR_FLOW_STATE');
    }
  });

  it('rejects load with ERR_FLOW_STATE when the payload is malformed', () => {
    expect.hasAssertions();
    sessionStorage.setItem('auth-orchestrator:flow', JSON.stringify({ v: 1, state: 42 }));
    try {
      new FlowStateStorage().load();
    } catch (error) {
      expect(error).toBeInstanceOf(StateError);
      expect((error as StateError).code).toBe('ERR_FLOW_STATE');
    }
  });

  it('rejects any operation with ConfigError when no sessionStorage global exists', () => {
    expect.hasAssertions();
    vi.stubGlobal('sessionStorage', undefined);
    try {
      new FlowStateStorage().save(makeFlow());
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).code).toBe('ERR_CONFIG');
    }
  });

  it('uses an injected backend instead of the global', () => {
    const entries = new Map<string, string>();
    const backend: Storage = {
      get length() {
        return entries.size;
      },
      clear: () => entries.clear(),
      getItem: (key) => entries.get(key) ?? null,
      key: () => null,
      removeItem: (key) => {
        entries.delete(key);
      },
      setItem: (key, value) => {
        entries.set(key, value);
      },
    };
    const storage = new FlowStateStorage(backend);
    const flow = makeFlow();
    storage.save(flow);
    expect(sessionStorage.getItem('auth-orchestrator:flow')).toBeNull();
    expect(storage.load()).toEqual(flow);
  });
});

describe('isFlowStateFresh', () => {
  it('accepts a flow at the TTL boundary', () => {
    const flow = makeFlow({ createdAt: 10_000 });
    expect(isFlowStateFresh(flow, 10_000 + FLOW_STATE_TTL_MS)).toBe(true);
  });

  it('rejects a flow past the TTL boundary', () => {
    const flow = makeFlow({ createdAt: 10_000 });
    expect(isFlowStateFresh(flow, 10_000 + FLOW_STATE_TTL_MS + 1)).toBe(false);
  });
});
