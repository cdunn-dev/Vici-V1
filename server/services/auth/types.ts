// Authentication Error Types and Messages

export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'VALIDATION_ERROR'
  | 'SESSION_ERROR'
  | 'UNAUTHORIZED'
  | 'DATABASE_ERROR';

export interface AuthErrorMetadata {
  httpStatus: number;
  userMessage: string;
}

// Error metadata for different error types
export const AUTH_ERROR_METADATA: Record<AuthErrorCode, AuthErrorMetadata> = {
  INVALID_CREDENTIALS: {
    httpStatus: 401,
    userMessage: 'Invalid email or password'
  },
  USER_NOT_FOUND: {
    httpStatus: 404,
    userMessage: 'User not found'
  },
  EMAIL_EXISTS: {
    httpStatus: 409,
    userMessage: 'Email already exists'
  },
  VALIDATION_ERROR: {
    httpStatus: 400,
    userMessage: 'Invalid input data'
  },
  SESSION_ERROR: {
    httpStatus: 500,
    userMessage: 'Session management error'
  },
  UNAUTHORIZED: {
    httpStatus: 401,
    userMessage: 'Please log in to continue'
  },
  DATABASE_ERROR: {
    httpStatus: 500,
    userMessage: 'Internal server error'
  }
};

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
  }

  get metadata(): AuthErrorMetadata {
    return AUTH_ERROR_METADATA[this.code];
  }

  get httpStatus(): number {
    return this.metadata.httpStatus;
  }

  get userMessage(): string {
    return this.metadata.userMessage;
  }
}

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password combination',
  USER_NOT_FOUND: 'User not found with the provided credentials',
  EMAIL_EXISTS: 'A user with this email already exists',
  PASSWORD_REQUIRED: 'Password is required',
  EMAIL_REQUIRED: 'Email is required',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
  SESSION_EXPIRED: 'Your session has expired, please log in again',
  VERIFICATION_FAILED: 'Email verification failed',
  NOT_AUTHENTICATED: 'You must be logged in to perform this action'
} as const;
