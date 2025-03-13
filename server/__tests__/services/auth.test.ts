import { vi, describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../../storage';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { users } from '../../db/schema';
import { AuthError, ERROR_MESSAGES } from '../../services/auth/types';

const scryptAsync = promisify(scrypt);

// Mock storage operations
vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    createUser: vi.fn(),
    getUserByEmail: vi.fn()
  }
}));

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash passwords securely', async () => {
      const password = 'testPassword123';
      const salt = randomBytes(16).toString('hex');
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString('hex')}.${salt}`;

      expect(hashedPassword).toContain('.');
      expect(hashedPassword.split('.')[1]).toHaveLength(32); // salt length
    });

    it('should verify passwords correctly', async () => {
      const password = 'testPassword123';
      const salt = randomBytes(16).toString('hex');
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const storedHash = `${buf.toString('hex')}.${salt}`;

      const [hashed] = storedHash.split('.');
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;

      expect(timingSafeEqual(hashedBuf, suppliedBuf)).toBe(true);
    });

    it('should detect invalid passwords', async () => {
      const correctPassword = 'correctPassword123';
      const wrongPassword = 'wrongPassword123';
      const salt = randomBytes(16).toString('hex');
      const buf = (await scryptAsync(correctPassword, salt, 64)) as Buffer;
      const storedHash = `${buf.toString('hex')}.${salt}`;

      const [hashed] = storedHash.split('.');
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(wrongPassword, salt, 64)) as Buffer;

      expect(timingSafeEqual(hashedBuf, suppliedBuf)).toBe(false);
    });
  });

  describe('User Authentication', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword.salt',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should authenticate valid credentials', async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue(mockUser);
      const result = await storage.getUserByEmail('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should reject invalid credentials', async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue(undefined);
      const result = await storage.getUserByEmail('wrong@example.com');
      expect(result).toBeUndefined();
    });

    it('should throw AuthError for non-existent user', async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue(undefined);

      try {
        await storage.getUserByEmail('nonexistent@example.com');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('USER_NOT_FOUND');
        expect(error.message).toBe(ERROR_MESSAGES.USER_NOT_FOUND);
      }
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(storage.getUserByEmail).mockRejectedValue(new Error('Database connection failed'));

      try {
        await storage.getUserByEmail('test@example.com');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('User Registration', () => {
    const generateUniqueEmail = () => `test${Date.now()}@example.com`;

    it('should create new users successfully', async () => {
      const newUser = {
        email: generateUniqueEmail(),
        password: 'password123'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue(undefined);
      vi.mocked(storage.createUser).mockResolvedValue({
        id: 1,
        email: newUser.email,
        password: expect.any(String),
        emailVerified: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });

      const result = await storage.createUser(newUser);
      expect(result).toHaveProperty('id');
      expect(result.email).toBe(newUser.email);
      expect(result.emailVerified).toBe(false);
    });

    it('should prevent duplicate emails', async () => {
      const existingUser = {
        email: generateUniqueEmail(),
        password: 'password123'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: 1,
        email: existingUser.email,
        password: 'hashedPassword',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      try {
        await storage.createUser(existingUser);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('EMAIL_EXISTS');
        expect(error.message).toBe(ERROR_MESSAGES.EMAIL_EXISTS);
      }
    });

    it('should validate email format', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'password123'
      };

      try {
        await storage.createUser(invalidUser);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe(ERROR_MESSAGES.INVALID_EMAIL);
      }
    });

    it('should validate password length', async () => {
      const userWithShortPassword = {
        email: generateUniqueEmail(),
        password: '123'
      };

      try {
        await storage.createUser(userWithShortPassword);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
      }
    });
  });

  describe('Session Management', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should retrieve user by id', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(mockUser);
      const result = await storage.getUser(1);
      expect(result).toEqual(mockUser);
    });

    it('should handle non-existent user ids', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(undefined);

      try {
        await storage.getUser(999);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('USER_NOT_FOUND');
      }
    });

    it('should handle session errors gracefully', async () => {
      vi.mocked(storage.getUser).mockRejectedValue(new Error('Session store error'));

      try {
        await storage.getUser(1);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('SESSION_ERROR');
      }
    });
  });
});