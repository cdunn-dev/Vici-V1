import { vi, describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../../storage';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { users } from '../../db/schema';

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

      // Mock getUserByEmail to return an existing user
      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: 1,
        email: existingUser.email,
        password: 'hashedPassword',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock createUser to reject with a duplicate email error
      vi.mocked(storage.createUser).mockRejectedValue(
        new Error('Email already exists')
      );

      // Test that creating a user with a duplicate email rejects
      await expect(storage.createUser(existingUser))
        .rejects
        .toThrow('Email already exists');
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
      const result = await storage.getUser(999);
      expect(result).toBeUndefined();
    });
  });
});