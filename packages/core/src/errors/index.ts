/**
 * Base error class for all auth-related errors.
 * Includes a `toJSON()` that masks sensitive fields, safe for logging to Sentry/DataDog.
 */
export class AuthError extends Error {
  readonly code: string;
  override readonly cause?: unknown;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.cause = options?.cause;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}

export class ConfigError extends AuthError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('ERR_CONFIG', message, options);
    this.name = 'ConfigError';
  }
}

export class NetworkError extends AuthError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('ERR_NETWORK', message, options);
    this.name = 'NetworkError';
  }
}

export class TokenError extends AuthError {
  /**
   * Accepts an optional granular `code` (e.g. `ERR_TOKEN_MISSING`,
   * `ERR_TOKEN_EXPIRED`); defaults to the generic `ERR_TOKEN`.
   */
  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(options?.code ?? 'ERR_TOKEN', message, options);
    this.name = 'TokenError';
  }
}

export class StateError extends AuthError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('ERR_STATE', message, options);
    this.name = 'StateError';
  }
}
