import { vi, describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../../storage';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { type User } from '../../db/schema';

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
    const mockUser: User = {
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
    const newUser = {
      email: 'new@example.com',
      password: 'password123'
    };

    it('should create new users successfully', async () => {
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
    });

    it('should prevent duplicate emails', async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: 1,
        email: newUser.email,
        password: 'existingHash',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(storage.createUser(newUser)).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    const mockUser: User = {
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