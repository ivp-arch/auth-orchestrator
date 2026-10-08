import type { IDToken } from 'oauth4webapi';
import { describe, expect, it } from 'vitest';
import { FlowError } from '../../src/errors';
import { buildUser } from '../../src/flows/user';

describe('buildUser', () => {
  it('maps the standard claims and passes the rest through', () => {
    const user = buildUser({
      sub: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://app.example.com/avatar.png',
      preferred_username: 'tester',
      email_verified: true,
    } as IDToken);

    expect(user).toEqual({
      sub: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://app.example.com/avatar.png',
      preferred_username: 'tester',
      email_verified: true,
    });
  });

  it('ignores non-string standard claims', () => {
    const user = buildUser({ sub: 'user-1', name: 42, email: null } as unknown as IDToken);
    expect(user.sub).toBe('user-1');
    expect('name' in user).toBe(false);
    expect('email' in user).toBe(false);
  });

  it('rejects with ERR_ID_TOKEN_INVALID when sub is missing', () => {
    expect.hasAssertions();
    try {
      buildUser({ name: 'No Subject' } as unknown as IDToken);
    } catch (error) {
      expect(error).toBeInstanceOf(FlowError);
      expect((error as FlowError).code).toBe('ERR_ID_TOKEN_INVALID');
    }
  });
});
