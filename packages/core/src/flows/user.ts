import type { IDToken } from 'oauth4webapi';
import { FlowError } from '../errors';
import type { User } from '../types';

const STANDARD_CLAIMS = ['sub', 'name', 'email', 'picture'] as const;

/**
 * Builds the `User` from the *validated* ID-token claims (validated by
 * oauth4webapi: `iss`, `aud`, `exp`, `nonce`, signature). No userinfo call in
 * Week 3 — extra claims arrive as they are.
 */
export function buildUser(claims: IDToken): User {
  if (typeof claims.sub !== 'string') {
    throw new FlowError('The ID token is missing a "sub" claim.', {
      code: 'ERR_ID_TOKEN_INVALID',
    });
  }

  const user: User = { sub: claims.sub };
  for (const claim of STANDARD_CLAIMS) {
    if (claim === 'sub') {
      continue;
    }
    const value = claims[claim];
    if (typeof value === 'string') {
      user[claim] = value;
    }
  }
  // Remaining claims are exposed as-is under their OIDC names.
  for (const [claim, value] of Object.entries(claims)) {
    if (!(STANDARD_CLAIMS as readonly string[]).includes(claim) && !(claim in user)) {
      user[claim] = value;
    }
  }
  return user;
}
