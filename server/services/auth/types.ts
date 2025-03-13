// Authentication Error Types and Messages

export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_EXISTS' 
  | 'VALIDATION_ERROR'
  | 'SESSION_ERROR'
  | 'UNAUTHORIZED'
  | 'DATABASE_ERROR'
  | 'NOT_AUTHENTICATED';

export interface AuthErrorMetadata {
  httpStatus: number;
  userMessage: string;
}

// Error metadata for different error types
export const AUTH_ERROR_METADATA: Record<AuthErrorCode, AuthErrorMetadata> = {
  INVALID_CREDENTIALS: {
    httpStatus: 401,
    userMessage: 'Invalid email or password combination'
  },
  USER_NOT_FOUND: {
    httpStatus: 404,
    userMessage: 'User not found'
  },
  EMAIL_EXISTS: {
    httpStatus: 409,
    userMessage: 'A user with this email already exists'
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
  },
  NOT_AUTHENTICATED: {
    httpStatus: 401,
    userMessage: 'You must be logged in to perform this action'
  }
};

export class AuthError extends Error {
  public readonly httpStatus: number;
  public readonly userMessage: string;

  constructor(
    message: string,
    public readonly code: AuthErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';

    const metadata = AUTH_ERROR_METADATA[code];
    if (!metadata) {
      throw new Error(`Invalid auth error code: ${code}`);
    }

    this.httpStatus = metadata.httpStatus;
    this.userMessage = metadata.userMessage;
  }
}

// Common error messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password combination',
  USER_NOT_FOUND: 'User not found with the provided credentials',
  EMAIL_EXISTS: 'A user with this email already exists',
  VALIDATION_ERROR: 'Invalid input data',
  SESSION_ERROR: 'Session management error',
  DATABASE_ERROR: 'Database operation failed',
  NOT_AUTHENTICATED: 'You must be logged in to perform this action',
  PASSWORD_REQUIRED: 'Password is required',
  EMAIL_REQUIRED: 'Email is required',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
  SESSION_EXPIRED: 'Your session has expired, please log in again',
  VERIFICATION_FAILED: 'Email verification failed'
} as const;