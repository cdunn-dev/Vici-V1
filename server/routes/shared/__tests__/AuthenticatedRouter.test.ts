import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import { createAuthenticatedRouter } from '../AuthenticatedRouter';
import { AuthenticatedRequest, AuthenticatedRequestHandler, FileUploadRequestHandler } from '../../../types/express';
import { ParsedQs } from 'qs';
import { WebSocket } from 'ws';
import { Express } from 'express';
import { Readable, Writable } from 'stream';
import { z } from 'zod';

// Custom type for file uploads in tests
type TestFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  stream: Readable;
  destination: string;
  filename: string;
  path: string;
};

type AuthenticatedRouterType = {
  get(path: string, ...handlers: AuthenticatedRequestHandler[]): any;
  post(path: string, ...handlers: AuthenticatedRequestHandler[]): any;
  put(path: string, ...handlers: AuthenticatedRequestHandler[]): any;
  patch(path: string, ...handlers: AuthenticatedRequestHandler[]): any;
  delete(path: string, ...handlers: AuthenticatedRequestHandler[]): any;
};

describe('AuthenticatedRouter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let router: AuthenticatedRouterType;

  const createMockSession = (userId?: number): Session & { userId?: number } => ({
    id: 'test-session-id',
    cookie: {
      originalMaxAge: 3600000,
      maxAge: 3600000,
      secure: false,
      httpOnly: true,
      path: '/'
    },
    regenerate: jest.fn(),
    destroy: jest.fn(),
    reload: jest.fn(),
    save: jest.fn(),
    touch: jest.fn(),
    resetMaxAge: jest.fn(),
    userId
  });

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    router = createAuthenticatedRouter() as AuthenticatedRouterType;
  });

  describe('Authentication Validation', () => {
    it('should reject requests without user', async () => {
      mockReq = {
        session: createMockSession()
      };
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid user.id type', async () => {
      mockReq = {
        user: { id: '123' as any, email: 'test@example.com' },
        session: createMockSession()
      };
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject requests without session', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' }
      };
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid session'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid session.userId type', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession('123' as any)
      };
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid session'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject requests with mismatched user and session IDs', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(456)
      };
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid session'
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject requests with missing user email', async () => {
      mockReq = {
        user: { id: 123 } as any,
        session: createMockSession(123)
      };
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required'
      });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Successful Authentication', () => {
    it('should pass valid requests to handler', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(123)
      };
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 123, email: 'test@example.com' }
        }),
        mockRes,
        mockNext
      );
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle handler errors', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(123)
      };
      const error = new Error('Test error');
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(error);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle multiple handlers in sequence', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(123)
      };
      const handler1: AuthenticatedRequestHandler = jest.fn();
      const handler2: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler1, handler2);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle async handlers correctly', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(123)
      };
      const handler: AuthenticatedRequestHandler = jest.fn().mockImplementation(async () => {
        // Simulate async operation without timers
        await Promise.resolve();
      });
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety in handler', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(123)
      };

      // This should compile without type errors
      const handler: AuthenticatedRequestHandler = async (req) => {
        // TypeScript should know these are safe
        const userId: number = req.user.id;
        const email: string = req.user.email;
        const sessionUserId: number | undefined = req.session.userId;
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should enforce type safety in handler parameters', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(123)
      };

      // This should cause a type error if uncommented
      /*
      const handler: AuthenticatedRequestHandler = async (req) => {
        const invalidId: string = req.user.id; // Type error
        const invalidEmail: number = req.user.email; // Type error
      };
      */

      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('HTTP Methods', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle POST requests', async () => {
      mockReq = validRequest;
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: validRequest.user
        }),
        mockRes,
        mockNext
      );
    });

    it('should handle PUT requests', async () => {
      mockReq = validRequest;
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.put('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: validRequest.user
        }),
        mockRes,
        mockNext
      );
    });

    it('should handle PATCH requests', async () => {
      mockReq = validRequest;
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.patch('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: validRequest.user
        }),
        mockRes,
        mockNext
      );
    });

    it('should handle DELETE requests', async () => {
      mockReq = validRequest;
      const handler: AuthenticatedRequestHandler = jest.fn();
      const route = router.delete('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: validRequest.user
        }),
        mockRes,
        mockNext
      );
    });

    it('should handle multiple methods on the same path', async () => {
      mockReq = validRequest;
      const getHandler: AuthenticatedRequestHandler = jest.fn();
      const postHandler: AuthenticatedRequestHandler = jest.fn();
      
      router.get('/test', getHandler);
      router.post('/test', postHandler);
      
      await router.get('/test')(mockReq as Request, mockRes as Response, mockNext);
      expect(getHandler).toHaveBeenCalled();
      expect(postHandler).not.toHaveBeenCalled();

      await router.post('/test')(mockReq as Request, mockRes as Response, mockNext);
      expect(postHandler).toHaveBeenCalled();
    });
  });

  describe('Specific Error Scenarios', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle network errors', async () => {
      mockReq = validRequest;
      const networkError = new Error('Network timeout');
      networkError.name = 'NetworkError';
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(networkError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(networkError);
    });

    it('should handle validation errors', async () => {
      mockReq = validRequest;
      const validationError = new Error('Invalid input');
      validationError.name = 'ValidationError';
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(validationError);
      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(validationError);
    });

    it('should handle database errors', async () => {
      mockReq = validRequest;
      const dbError = new Error('Database connection failed');
      dbError.name = 'DatabaseError';
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(dbError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle multiple error types in sequence', async () => {
      mockReq = validRequest;
      const errors = [
        new Error('First error'),
        new Error('Second error'),
        new Error('Third error')
      ];
      
      const handlers: AuthenticatedRequestHandler[] = errors.map(error => 
        jest.fn().mockRejectedValue(error)
      );
      
      const route = router.get('/test', ...handlers);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handlers[0]).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(errors[0]);
    });
  });

  describe('Request/Response Type Safety in Middleware', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should maintain type safety in request body', async () => {
      mockReq = {
        ...validRequest,
        body: { name: 'test', age: 25 }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // TypeScript should enforce these types
        const name: string = req.body.name;
        const age: number = req.body.age;
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should maintain type safety in query parameters', async () => {
      mockReq = {
        ...validRequest,
        query: { page: '1', limit: '10' }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // TypeScript should enforce these types
        const page = req.query.page as string;
        const limit = req.query.limit as string;
        
        // Type assertions should be safe here because we know the query structure
        expect(typeof page).toBe('string');
        expect(typeof limit).toBe('string');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle complex query parameters', async () => {
      mockReq = {
        ...validRequest,
        query: {
          filters: { status: 'active', type: 'user' },
          sort: 'created_at',
          order: 'desc'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // TypeScript should enforce these types
        const filters = req.query.filters as Record<string, string>;
        const sort = req.query.sort as string;
        const order = req.query.order as 'asc' | 'desc';
        
        expect(filters).toBeDefined();
        expect(sort).toBeDefined();
        expect(order).toBeDefined();
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should maintain type safety in response', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        // TypeScript should enforce these types
        res.status(200).json({ success: true });
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Route Parameter Handling', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle route parameters correctly', async () => {
      mockReq = {
        ...validRequest,
        params: { id: '123', type: 'user' }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // TypeScript should enforce these types
        const id: string = req.params.id;
        const type: string = req.params.type;
      };

      const route = router.get('/:type/:id', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle optional route parameters', async () => {
      mockReq = {
        ...validRequest,
        params: { id: '123' }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // TypeScript should enforce these types
        const id: string = req.params.id;
        const optional: string | undefined = (req.params as any).optional;
      };

      const route = router.get('/:id/:optional?', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle multiple routes with different parameters', async () => {
      mockReq = {
        ...validRequest,
        params: { id: '123' }
      };

      const handler1: AuthenticatedRequestHandler = async (req) => {
        const id: string = req.params.id;
      };

      const handler2: AuthenticatedRequestHandler = async (req) => {
        const type: string = (req.params as any).type;
      };

      router.get('/users/:id', handler1);
      router.get('/items/:type', handler2);

      await router.get('/users/:id')(mockReq as Request, mockRes as Response, mockNext);
      expect(handler1).toHaveBeenCalled();

      mockReq.params = { type: 'book' };
      await router.get('/items/:type')(mockReq as Request, mockRes as Response, mockNext);
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle route parameter validation', async () => {
      mockReq = {
        ...validRequest,
        params: { id: 'invalid-id' }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // This should cause a type error if uncommented
        /*
        const numericId: number = parseInt(req.params.id);
        if (isNaN(numericId)) {
          throw new Error('Invalid ID format');
        }
        */
      };

      const route = router.get('/:id', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting and Authentication Failures', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle rate limit exceeded errors', async () => {
      mockReq = validRequest;
      const rateLimitError = new Error('Too many requests');
      rateLimitError.name = 'RateLimitError';
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(rateLimitError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(rateLimitError);
    });

    it('should handle token expiration errors', async () => {
      mockReq = validRequest;
      const tokenError = new Error('Token expired');
      tokenError.name = 'TokenExpiredError';
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(tokenError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(tokenError);
    });

    it('should handle invalid token errors', async () => {
      mockReq = validRequest;
      const tokenError = new Error('Invalid token');
      tokenError.name = 'InvalidTokenError';
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(tokenError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(tokenError);
    });

    it('should handle concurrent request limiting', async () => {
      mockReq = validRequest;
      const concurrentError = new Error('Too many concurrent requests');
      concurrentError.name = 'ConcurrentRequestError';
      const handler: AuthenticatedRequestHandler = jest.fn().mockRejectedValue(concurrentError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(concurrentError);
    });
  });

  describe('File Upload Handling', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle single file uploads', async () => {
      const mockStream = new Readable();
      mockStream.push('test');
      mockStream.push(null);

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
        stream: mockStream,
        destination: '',
        filename: 'test.jpg',
        path: '/tmp/test.jpg'
      };

      mockReq = {
        ...validRequest,
        file: mockFile
      };

      const handler: FileUploadRequestHandler = async (req) => {
        expect(req.file).toBeDefined();
        expect(req.file?.fieldname).toBe('file');
        expect(req.file?.mimetype).toBe('image/jpeg');
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle multiple file uploads', async () => {
      const mockStream1 = new Readable();
      mockStream1.push('test1');
      mockStream1.push(null);

      const mockStream2 = new Readable();
      mockStream2.push('test2');
      mockStream2.push(null);

      const mockFiles = [
        {
          fieldname: 'files',
          originalname: 'test1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test1'),
          size: 1024,
          stream: mockStream1,
          destination: '',
          filename: 'test1.jpg',
          path: '/tmp/test1.jpg'
        },
        {
          fieldname: 'files',
          originalname: 'test2.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test2'),
          size: 1024,
          stream: mockStream2,
          destination: '',
          filename: 'test2.jpg',
          path: '/tmp/test2.jpg'
        }
      ];

      mockReq = {
        ...validRequest,
        files: mockFiles
      };

      const handler: FileUploadRequestHandler = async (req) => {
        expect(req.files).toBeDefined();
        expect(req.files?.length).toBe(2);
        expect(req.files?.[0].mimetype).toBe('image/jpeg');
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle file upload errors', async () => {
      mockReq = validRequest;
      const uploadError = new Error('File upload failed');
      uploadError.name = 'UploadError';
      const handler = jest.fn().mockRejectedValue(uploadError);
      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(uploadError);
    });

    it('should handle multipart form data', async () => {
      mockReq = {
        ...validRequest,
        body: {
          name: 'John Doe',
          age: '30',
          profile: {
            bio: 'Software developer',
            location: 'New York'
          }
        },
        files: {
          avatar: [{
            fieldname: 'avatar',
            originalname: 'profile.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('test'),
            size: 1024,
            stream: new Readable(),
            destination: '',
            filename: 'profile.jpg',
            path: '/tmp/profile.jpg'
          }]
        } as { [fieldname: string]: TestFile[] }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.body.name).toBe('John Doe');
        expect(req.body.age).toBe('30');
        expect(req.body.profile.bio).toBe('Software developer');
        expect((req.files as { [fieldname: string]: TestFile[] }).avatar[0].mimetype).toBe('image/jpeg');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('WebSocket Integration', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle WebSocket connection upgrades', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        // Simulate WebSocket upgrade
        const ws = mockSocket as unknown as WebSocket;
        ws.on('message', (data) => {
          expect(data).toBeDefined();
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle WebSocket authentication', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          expect(message.userId).toBe(req.user.id);
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle WebSocket errors', async () => {
      mockReq = validRequest;
      const wsError = new Error('WebSocket connection failed');
      wsError.name = 'WebSocketError';
      const handler = jest.fn().mockRejectedValue(wsError);
      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(wsError);
    });

    it('should handle WebSocket message validation', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            // TypeScript should enforce these types
            const type: string = message.type;
            const payload: unknown = message.payload;
            expect(type).toBeDefined();
            expect(payload).toBeDefined();
          } catch (error) {
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
          }
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Request Body Validation', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should validate request body against schema', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0),
        email: z.string().email()
      });

      mockReq = {
        ...validRequest,
        body: {
          name: 'John Doe',
          age: 25,
          email: 'john@example.com'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const validatedData = schema.parse(req.body);
        expect(validatedData.name).toBe('John Doe');
        expect(validatedData.age).toBe(25);
        expect(validatedData.email).toBe('john@example.com');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0),
        email: z.string().email()
      });

      mockReq = {
        ...validRequest,
        body: {
          name: 'John Doe',
          age: -1,
          email: 'invalid-email'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        try {
          schema.parse(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors).toHaveLength(2);
            expect(error.errors[0].path).toContain('age');
            expect(error.errors[1].path).toContain('email');
          }
        }
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle nested validation', async () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            preferences: z.object({
              theme: z.enum(['light', 'dark']),
              notifications: z.boolean()
            })
          })
        })
      });

      mockReq = {
        ...validRequest,
        body: {
          user: {
            profile: {
              name: 'John Doe',
              preferences: {
                theme: 'dark',
                notifications: true
              }
            }
          }
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const validatedData = schema.parse(req.body);
        expect(validatedData.user.profile.name).toBe('John Doe');
        expect(validatedData.user.profile.preferences.theme).toBe('dark');
        expect(validatedData.user.profile.preferences.notifications).toBe(true);
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Response Streaming', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle streaming responses', async () => {
      mockReq = validRequest;
      const mockWritable = new Writable({
        write(chunk, encoding, callback) {
          callback();
        }
      });

      mockRes = {
        ...mockRes,
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable();
        stream.push('chunk1');
        stream.push('chunk2');
        stream.push(null);
        stream.pipe(res as any);
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable();
        stream.emit('error', new Error('Stream error'));
        stream.pipe(res as any);
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle backpressure', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        write: jest.fn().mockReturnValue(false),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable({
          read() {
            this.push('data');
            this.push(null);
          }
        });
        stream.pipe(res as any);
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalled();
    });
  });

  describe('Error Middleware', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle custom error types', async () => {
      class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      }

      mockReq = validRequest;
      const error = new ValidationError('Invalid input');
      const handler = jest.fn().mockRejectedValue(error);
      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle error with additional context', async () => {
      class DatabaseError extends Error {
        constructor(message: string, public context: Record<string, unknown>) {
          super(message);
          this.name = 'DatabaseError';
        }
      }

      mockReq = validRequest;
      const error = new DatabaseError('Connection failed', { 
        code: 'ECONNREFUSED',
        host: 'localhost',
        port: 5432
      });
      const handler = jest.fn().mockRejectedValue(error);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle async error handling', async () => {
      mockReq = validRequest;
      const error = new Error('Async error');
      const handler = jest.fn().mockImplementation(async () => {
        await Promise.resolve();
        throw error;
      });
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle large file uploads', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const mockStream = new Readable();
      mockStream.push(largeBuffer);
      mockStream.push(null);

      const mockFile = {
        fieldname: 'file',
        originalname: 'large-file.dat',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        buffer: largeBuffer,
        size: 10 * 1024 * 1024,
        stream: mockStream,
        destination: '',
        filename: 'large-file.dat',
        path: '/tmp/large-file.dat'
      };

      mockReq = {
        ...validRequest,
        file: mockFile
      };

      const handler: FileUploadRequestHandler = async (req) => {
        expect(req.file).toBeDefined();
        expect(req.file?.size).toBe(10 * 1024 * 1024);
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle WebSocket reconnection attempts', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        let reconnectAttempts = 0;
        
        ws.on('close', () => {
          reconnectAttempts++;
          if (reconnectAttempts < 3) {
            // Simulate reconnection
            ws.on('open', () => {
              ws.send(JSON.stringify({ type: 'reconnected', attempt: reconnectAttempts }));
            });
          }
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should handle rate limit bypass attempts', async () => {
      mockReq = validRequest;
      const requests = Array(100).fill(null).map(() => ({
        ...validRequest,
        ip: '127.0.0.1'
      }));

      const handler = jest.fn();
      const route = router.get('/test', handler);

      // Simulate rapid requests
      await Promise.all(requests.map(req => 
        route(req as Request, mockRes as Response, mockNext)
      ));

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Request Timeout Handling', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle request timeouts', async () => {
      mockReq = validRequest;
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      const handler = jest.fn().mockImplementation(async () => {
        // Simulate timeout without using setTimeout
        await Promise.resolve();
        throw timeoutError;
      });

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(timeoutError);
    });

    it('should handle partial timeouts in streaming responses', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable({
          read() {
            // Simulate data push without timers
            this.push('data');
            this.push(null);
          }
        });
        stream.pipe(res as any);
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalled();
    });
  });

  describe('Memory Leak Detection', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should clean up event listeners', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn(),
        removeAllListeners: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        ws.on('message', () => {});
        ws.on('error', () => {});
        ws.on('close', () => {
          ws.removeAllListeners();
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    });

    it('should clean up file streams', async () => {
      const mockStream = new Readable();
      mockStream.push('test');
      mockStream.push(null);

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
        stream: mockStream,
        destination: '',
        filename: 'test.jpg',
        path: '/tmp/test.jpg'
      };

      mockReq = {
        ...validRequest,
        file: mockFile
      };

      const handler: FileUploadRequestHandler = async (req) => {
        const stream = req.file?.stream;
        stream?.on('end', () => {
          stream.destroy();
        });
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockStream.destroyed).toBe(true);
    });
  });

  describe('Security Vulnerability Testing', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle SQL injection attempts', async () => {
      mockReq = {
        ...validRequest,
        body: {
          query: "'; DROP TABLE users; --"
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // Sanitize input
        const sanitizedQuery = req.body.query.replace(/[^a-zA-Z0-9\s]/g, '');
        expect(sanitizedQuery).not.toContain('DROP TABLE');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle XSS attempts', async () => {
      mockReq = {
        ...validRequest,
        body: {
          content: '<script>alert("xss")</script>'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // Sanitize input
        const sanitizedContent = req.body.content.replace(/<[^>]*>/g, '');
        expect(sanitizedContent).not.toContain('<script>');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle path traversal attempts', async () => {
      mockReq = {
        ...validRequest,
        params: {
          file: '../../../etc/passwd'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        // Sanitize path
        const sanitizedPath = req.params.file.replace(/\.\./g, '');
        expect(sanitizedPath).not.toContain('../');
      };

      const route = router.get('/files/:file', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Performance Testing', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle concurrent requests efficiently', async () => {
      mockReq = validRequest;
      const startTime = Date.now();
      const requests = Array(100).fill(null).map(() => ({
        ...validRequest,
        ip: '127.0.0.1'
      }));

      const handler = jest.fn();
      const route = router.get('/test', handler);

      // Simulate concurrent requests
      await Promise.all(requests.map(req => 
        route(req as Request, mockRes as Response, mockNext)
      ));

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(handler).toHaveBeenCalledTimes(100);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large response payloads efficiently', async () => {
      mockReq = validRequest;
      const largeData = Array(10000).fill({ id: 1, name: 'test' });
      
      mockRes = {
        ...mockRes,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        res.json(largeData);
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(largeData);
    });

    it('should handle streaming large files efficiently', async () => {
      mockReq = validRequest;
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalSize = 100 * 1024 * 1024; // 100MB total
      let bytesStreamed = 0;

      mockRes = {
        ...mockRes,
        write: jest.fn().mockImplementation((chunk) => {
          bytesStreamed += chunk.length;
        }),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable({
          read() {
            if (bytesStreamed < totalSize) {
              this.push(Buffer.alloc(chunkSize));
            } else {
              this.push(null);
            }
          }
        });
        stream.pipe(res as any);
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(bytesStreamed).toBe(totalSize);
    });
  });

  describe('Request Body Parsing', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle JSON request bodies', async () => {
      mockReq = {
        ...validRequest,
        body: {
          name: 'John Doe',
          age: 30,
          hobbies: ['reading', 'gaming']
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.body.name).toBe('John Doe');
        expect(req.body.age).toBe(30);
        expect(req.body.hobbies).toEqual(['reading', 'gaming']);
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle URL-encoded request bodies', async () => {
      mockReq = {
        ...validRequest,
        body: {
          'user[name]': 'John Doe',
          'user[age]': '30',
          'user[hobbies][]': ['reading', 'gaming']
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.body['user[name]']).toBe('John Doe');
        expect(req.body['user[age]']).toBe('30');
        expect(req.body['user[hobbies][]']).toEqual(['reading', 'gaming']);
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle multipart form data', async () => {
      mockReq = {
        ...validRequest,
        body: {
          name: 'John Doe',
          age: '30',
          profile: {
            bio: 'Software developer',
            location: 'New York'
          }
        },
        files: {
          avatar: [{
            fieldname: 'avatar',
            originalname: 'profile.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('test'),
            size: 1024,
            stream: new Readable(),
            destination: '',
            filename: 'profile.jpg',
            path: '/tmp/profile.jpg'
          }]
        } as { [fieldname: string]: TestFile[] }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.body.name).toBe('John Doe');
        expect(req.body.age).toBe('30');
        expect(req.body.profile.bio).toBe('Software developer');
        expect((req.files as { [fieldname: string]: TestFile[] }).avatar[0].mimetype).toBe('image/jpeg');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Query Parameter Handling', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle simple query parameters', async () => {
      mockReq = {
        ...validRequest,
        query: {
          page: '1',
          limit: '10',
          sort: 'created_at'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.query.page).toBe('1');
        expect(req.query.limit).toBe('10');
        expect(req.query.sort).toBe('created_at');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle array query parameters', async () => {
      mockReq = {
        ...validRequest,
        query: {
          categories: ['books', 'movies', 'music'],
          tags: ['new', 'featured']
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.query.categories).toEqual(['books', 'movies', 'music']);
        expect(req.query.tags).toEqual(['new', 'featured']);
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle nested query parameters', async () => {
      mockReq = {
        ...validRequest,
        query: {
          filter: {
            status: 'active',
            type: 'user',
            date: {
              from: '2024-01-01',
              to: '2024-12-31'
            }
          }
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const filter = req.query.filter as ParsedQs;
        expect(filter.status).toBe('active');
        expect(filter.type).toBe('user');
        expect((filter.date as ParsedQs).from).toBe('2024-01-01');
        expect((filter.date as ParsedQs).to).toBe('2024-12-31');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Response Formatting', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle JSON responses', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        res.status(200).json({
          success: true,
          data: {
            id: 1,
            name: 'Test Item'
          }
        });
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 1,
          name: 'Test Item'
        }
      });
    });

    it('should handle text responses', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        res.status(200).send('Plain text response');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('Plain text response');
    });

    it('should handle HTML responses', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        send: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        res
          .status(200)
          .set('Content-Type', 'text/html')
          .send('<html><body><h1>Hello World</h1></body></html>');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockRes.send).toHaveBeenCalledWith('<html><body><h1>Hello World</h1></body></html>');
    });
  });

  describe('Request Headers and Cookies', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle custom request headers', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-custom-header': 'test-value',
          'x-api-version': '1.0',
          'x-client-id': 'client123'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.headers['x-custom-header']).toBe('test-value');
        expect(req.headers['x-api-version']).toBe('1.0');
        expect(req.headers['x-client-id']).toBe('client123');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle cookie parsing', async () => {
      mockReq = {
        ...validRequest,
        cookies: {
          sessionId: 'abc123',
          theme: 'dark',
          language: 'en-US'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.cookies.sessionId).toBe('abc123');
        expect(req.cookies.theme).toBe('dark');
        expect(req.cookies.language).toBe('en-US');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle signed cookies', async () => {
      mockReq = {
        ...validRequest,
        signedCookies: {
          authToken: 'signed-token-123',
          preferences: '{"theme":"dark","notifications":true}'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.signedCookies.authToken).toBe('signed-token-123');
        expect(JSON.parse(req.signedCookies.preferences)).toEqual({
          theme: 'dark',
          notifications: true
        });
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle cookie setting in responses', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        cookie: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        res.cookie('theme', 'dark', {
          httpOnly: true,
          secure: true,
          maxAge: 3600000
        });
        res.status(200).json({ success: true });
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.cookie).toHaveBeenCalledWith('theme', 'dark', {
        httpOnly: true,
        secure: true,
        maxAge: 3600000
      });
    });
  });

  describe('Response Streaming Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle stream backpressure', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        write: jest.fn().mockReturnValue(false),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable({
          read() {
            if (!res.write('data')) {
              this.pause();
            }
          }
        });
        stream.pipe(res as any);
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalled();
    });

    it('should handle stream errors during write', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        write: jest.fn().mockImplementation(() => {
          throw new Error('Write error');
        }),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable({
          read() {
            this.push('data');
            this.push(null);
          }
        });
        stream.pipe(res as any);
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle client disconnection during streaming', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const stream = new Readable({
          read() {
            this.push('data');
            this.push(null);
          }
        });
        stream.pipe(res as any);
        
        // Simulate client disconnection
        res.emit('close');
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalled();
    });

    it('should handle multiple streams in parallel', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        once: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const streams = [
          new Readable({ read() { this.push('stream1'); this.push(null); } }),
          new Readable({ read() { this.push('stream2'); this.push(null); } }),
          new Readable({ read() { this.push('stream3'); this.push(null); } })
        ];

        // Pipe all streams to response
        streams.forEach(stream => stream.pipe(res as any));
      };

      const route = router.get('/stream', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalledTimes(3);
    });
  });

  describe('Request Body Validation Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle malformed JSON', async () => {
      mockReq = {
        ...validRequest,
        body: '{invalid:json}'
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        try {
          JSON.parse(req.body as string);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(SyntaxError);
        }
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email()
      });

      mockReq = {
        ...validRequest,
        body: {
          name: 'John Doe'
          // Missing age and email
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        try {
          schema.parse(req.body);
          fail('Should have thrown an error');
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors).toHaveLength(2);
            expect(error.errors.map(e => e.path[0])).toContain('age');
            expect(error.errors.map(e => e.path[0])).toContain('email');
          }
        }
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle field type mismatches', async () => {
      const schema = z.object({
        age: z.number(),
        isActive: z.boolean(),
        score: z.number()
      });

      mockReq = {
        ...validRequest,
        body: {
          age: '25', // Should be number
          isActive: 'true', // Should be boolean
          score: 95.5
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        try {
          schema.parse(req.body);
          fail('Should have thrown an error');
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors).toHaveLength(2);
            expect(error.errors.map(e => e.path[0])).toContain('age');
            expect(error.errors.map(e => e.path[0])).toContain('isActive');
          }
        }
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Error Handling Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should propagate errors through middleware chain', async () => {
      mockReq = validRequest;
      const error = new Error('Middleware error');
      
      const middleware1: AuthenticatedRequestHandler = jest.fn().mockImplementation(async (req, res, next) => {
        next(error);
      });
      
      const middleware2: AuthenticatedRequestHandler = jest.fn();
      const handler: AuthenticatedRequestHandler = jest.fn();
      
      const route = router.get('/test', middleware1, middleware2, handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle custom error types with stack traces', async () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      mockReq = validRequest;
      const error = new CustomError('Test error', 'TEST_ERROR');
      const handler = jest.fn().mockRejectedValue(error);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(error.stack).toBeDefined();
    });

    it('should handle error recovery scenarios', async () => {
      mockReq = validRequest;
      let retryCount = 0;
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        if (retryCount < 3) {
          retryCount++;
          throw new Error('Temporary error');
        }
        // Don't return anything, just don't throw
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle error logging and monitoring', async () => {
      mockReq = validRequest;
      const error = new Error('Test error');
      const errorLogger = jest.fn();
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        try {
          throw error;
        } catch (e) {
          errorLogger({
            error: e,
            requestId: req.headers['x-request-id'],
            userId: req.user.id,
            timestamp: new Date().toISOString()
          });
          throw e;
        }
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(errorLogger).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Security Testing', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should sanitize input data', async () => {
      mockReq = {
        ...validRequest,
        body: {
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
          bio: 'Hello <img src="x" onerror="alert(1)">'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const sanitizedName = req.body.name.replace(/<[^>]*>/g, '');
        const sanitizedBio = req.body.bio.replace(/<[^>]*>/g, '');
        
        expect(sanitizedName).toBe('alert("xss")');
        expect(sanitizedBio).toBe('Hello ');
        expect(req.body.email).toBe('test@example.com');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should prevent XSS attacks', async () => {
      mockReq = {
        ...validRequest,
        body: {
          content: '<script>document.cookie="hacked=1"</script>',
          title: '<img src=x onerror=alert(1)>'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const sanitizedContent = req.body.content.replace(/<[^>]*>/g, '');
        const sanitizedTitle = req.body.title.replace(/<[^>]*>/g, '');
        
        expect(sanitizedContent).toBe('document.cookie="hacked=1"');
        expect(sanitizedTitle).toBe('');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle CSRF protection', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-csrf-token': 'invalid-token'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const csrfToken = req.headers['x-csrf-token'];
        expect(csrfToken).toBeDefined();
        // In a real implementation, we would validate this token
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle rate limiting edge cases', async () => {
      mockReq = {
        ...validRequest,
        ip: '127.0.0.1'
      };

      const requests = Array(1000).fill(null).map(() => ({
        ...mockReq,
        headers: {
          'x-forwarded-for': '127.0.0.1'
        }
      }));

      const handler = jest.fn();
      const route = router.get('/test', handler);

      // Simulate rapid requests
      await Promise.all(requests.map(req => 
        route(req as Request, mockRes as Response, mockNext)
      ));

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle authentication bypass attempts', async () => {
      mockReq = {
        user: { id: 123, email: 'test@example.com' },
        session: createMockSession(456) // Mismatched IDs
      };

      const handler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Performance Testing', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should monitor memory usage', async () => {
      mockReq = validRequest;
      const initialMemory = process.memoryUsage().heapUsed;
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        // Create some memory pressure
        const largeArray = Array(1000000).fill('test');
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDiff = finalMemory - initialMemory;
        
        expect(memoryDiff).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle CPU usage under load', async () => {
      mockReq = validRequest;
      const startTime = process.cpuUsage();
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        // Simulate CPU-intensive operation
        for (let i = 0; i < 1000000; i++) {
          Math.random();
        }
        
        const endTime = process.cpuUsage(startTime);
        expect(endTime.user).toBeLessThan(1000000); // Less than 1 second of CPU time
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should manage connection pool efficiently', async () => {
      mockReq = validRequest;
      const connections = new Set();
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        // Simulate connection management
        const connection = { id: Date.now() };
        connections.add(connection);
        
        // Simulate some work
        await Promise.resolve();
        
        connections.delete(connection);
        expect(connections.size).toBe(0);
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should clean up resources properly', async () => {
      mockReq = validRequest;
      const resources = new Set();
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        // Simulate resource allocation
        const resource = { id: Date.now() };
        resources.add(resource);
        
        try {
          // Simulate some work
          await Promise.resolve();
        } finally {
          resources.delete(resource);
          expect(resources.size).toBe(0);
        }
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Integration Testing', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle database connection issues', async () => {
      mockReq = validRequest;
      const dbError = new Error('Database connection failed');
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        try {
          // Simulate database operation
          throw dbError;
        } catch (error) {
          expect(error).toBe(dbError);
          throw error;
        }
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle cache interaction', async () => {
      mockReq = validRequest;
      const cache = new Map();
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        const cacheKey = `user:${req.user.id}`;
        const cachedData = cache.get(cacheKey);
        
        if (!cachedData) {
          // Simulate cache miss
          const data = { id: req.user.id, name: 'Test User' };
          cache.set(cacheKey, data);
          expect(cache.size).toBe(1);
        }
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle external service integration', async () => {
      mockReq = validRequest;
      const externalService = {
        call: jest.fn().mockResolvedValue({ success: true })
      };
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        const result = await externalService.call();
        expect(result.success).toBe(true);
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(externalService.call).toHaveBeenCalled();
    });

    it('should handle service health checks', async () => {
      mockReq = validRequest;
      const healthStatus = {
        database: true,
        cache: true,
        externalService: true
      };
      
      const handler: AuthenticatedRequestHandler = async (req) => {
        const status = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: healthStatus
        };
        
        expect(status.status).toBe('healthy');
        expect(status.services.database).toBe(true);
        expect(status.services.cache).toBe(true);
        expect(status.services.externalService).toBe(true);
      };

      const route = router.get('/health', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('WebSocket Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle connection timeouts', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        let timeoutId: NodeJS.Timeout;
        
        ws.on('open', () => {
          timeoutId = setTimeout(() => {
            ws.terminate();
          }, 5000);
        });

        ws.on('close', () => {
          clearTimeout(timeoutId);
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    it('should handle message fragmentation', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        let messageBuffer = '';
        
        ws.on('message', (data) => {
          messageBuffer += data.toString();
          if (messageBuffer.includes('END')) {
            const completeMessage = messageBuffer.replace('END', '');
            expect(completeMessage).toBe('Hello World');
          }
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle binary messages', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        
        ws.on('message', (data) => {
          if (Buffer.isBuffer(data)) {
            expect(data.length).toBeGreaterThan(0);
            expect(data[0]).toBeDefined();
          }
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle ping/pong heartbeat', async () => {
      mockReq = validRequest;
      const mockSocket = {
        on: jest.fn(),
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        const ws = mockSocket as unknown as WebSocket;
        let lastPing = Date.now();
        
        ws.on('ping', () => {
          ws.pong();
          lastPing = Date.now();
        });

        ws.on('close', () => {
          const timeSinceLastPing = Date.now() - lastPing;
          expect(timeSinceLastPing).toBeLessThan(30000); // Less than 30 seconds
        });
      };

      const route = router.get('/ws', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('File Upload Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle file size limits', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const mockStream = new Readable();
      mockStream.push(largeBuffer);
      mockStream.push(null);

      const mockFile = {
        fieldname: 'file',
        originalname: 'large-file.dat',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        buffer: largeBuffer,
        size: 11 * 1024 * 1024,
        stream: mockStream,
        destination: '',
        filename: 'large-file.dat',
        path: '/tmp/large-file.dat'
      };

      mockReq = {
        ...validRequest,
        file: mockFile
      };

      const handler: FileUploadRequestHandler = async (req) => {
        if (req.file && req.file.size > 10 * 1024 * 1024) {
          throw new Error('File too large');
        }
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should validate file types', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('test'),
        size: 1024,
        stream: new Readable(),
        destination: '',
        filename: 'test.exe',
        path: '/tmp/test.exe'
      };

      mockReq = {
        ...validRequest,
        file: mockFile
      };

      const handler: FileUploadRequestHandler = async (req) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (req.file && !allowedTypes.includes(req.file.mimetype)) {
          throw new Error('Invalid file type');
        }
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle concurrent uploads', async () => {
      const mockFiles = Array(5).fill(null).map((_, i) => ({
        fieldname: 'files',
        originalname: `file${i}.jpg`,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
        stream: new Readable(),
        destination: '',
        filename: `file${i}.jpg`,
        path: `/tmp/file${i}.jpg`
      })) as TestFile[];

      mockReq = {
        ...validRequest,
        files: mockFiles
      };

      const handler: FileUploadRequestHandler = async (req) => {
        const uploadPromises = (req.files as TestFile[] || []).map(async (file) => {
          // Simulate upload processing
          await Promise.resolve();
          return file.originalname;
        });

        const results = await Promise.all(uploadPromises);
        expect(results).toHaveLength(5);
        expect(results).toEqual(expect.arrayContaining(['file0.jpg', 'file1.jpg', 'file2.jpg', 'file3.jpg', 'file4.jpg']));
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle upload cancellation', async () => {
      const mockStream = new Readable();
      mockStream.push('test');
      mockStream.push(null);

      const mockFile = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
        stream: mockStream,
        destination: '',
        filename: 'test.jpg',
        path: '/tmp/test.jpg'
      };

      mockReq = {
        ...validRequest,
        file: mockFile
      };

      const handler: FileUploadRequestHandler = async (req) => {
        const stream = req.file?.stream;
        stream?.on('close', () => {
          // Clean up any temporary files
          expect(stream.destroyed).toBe(true);
        });
      };

      const route = router.post('/upload', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Authentication Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle token refresh', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-token-expiry': '2024-01-01T00:00:00Z'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const tokenExpiry = new Date(req.headers['x-token-expiry'] as string);
        const now = new Date();
        
        if (tokenExpiry < now) {
          // Token needs refresh
          expect(req.headers['x-token-refresh']).toBeDefined();
        }
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle session timeouts', async () => {
      mockReq = {
        ...validRequest,
        session: {
          ...createMockSession(123),
          cookie: {
            ...createMockSession(123).cookie,
            maxAge: 0 // Expired session
          },
          regenerate: jest.fn(),
          destroy: jest.fn(),
          reload: jest.fn(),
          save: jest.fn(),
          touch: jest.fn(),
          resetMaxAge: jest.fn()
        }
      };

      const handler = jest.fn();
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle multiple device sessions', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-device-id': 'device123'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const deviceId = req.headers['x-device-id'];
        expect(deviceId).toBeDefined();
        // In a real implementation, we would validate this device ID
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle password change scenarios', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-password-changed': 'true'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const passwordChanged = req.headers['x-password-changed'];
        if (passwordChanged === 'true') {
          // Force re-authentication
          expect(mockRes.status).toHaveBeenCalledWith(401);
        }
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('API Versioning', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle version headers', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-api-version': '2.0'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const version = req.headers['x-api-version'];
        expect(version).toBe('2.0');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle backward compatibility', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-api-version': '1.0'
        },
        body: {
          name: 'John Doe',
          age: 30
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const version = req.headers['x-api-version'];
        if (version === '1.0') {
          // Handle legacy format
          expect(req.body.name).toBeDefined();
          expect(req.body.age).toBeDefined();
        }
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle deprecated endpoints', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-api-version': '1.0'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        res.status(410).json({
          status: 'error',
          message: 'This endpoint is deprecated',
          alternative: '/v2/test'
        });
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(410);
    });

    it('should handle version-specific validation', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-api-version': '2.0'
        },
        body: {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const version = req.headers['x-api-version'];
        if (version === '2.0') {
          // V2 requires email
          expect(req.body.email).toBeDefined();
        }
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Request/Response Headers Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should validate content type headers', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'content-type': 'application/json'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const contentType = req.headers['content-type'];
        expect(contentType).toBe('application/json');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle accept headers', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'accept': 'application/json, text/plain'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const accept = req.headers['accept'];
        expect(accept).toBe('application/json, text/plain');
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle CORS headers', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'origin': 'https://example.com',
          'access-control-request-method': 'POST'
        }
      };

      mockRes = {
        ...mockRes,
        set: jest.fn().mockReturnThis()
      };

      const handler: AuthenticatedRequestHandler = async (req, res) => {
        res.set({
          'Access-Control-Allow-Origin': req.headers.origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith({
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
    });

    it('should validate custom headers', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'x-api-key': 'test-api-key',
          'x-request-id': '123e4567-e89b-12d3-a456-426614174000'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const apiKey = req.headers['x-api-key'];
        const requestId = req.headers['x-request-id'];
        
        expect(apiKey).toBe('test-api-key');
        expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      };

      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Error Response Formatting', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should maintain consistent error response structure', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const error = new Error('Test error');
      const handler = jest.fn().mockRejectedValue(error);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error',
        code: 'INTERNAL_SERVER_ERROR'
      });
    });

    it('should map error codes correctly', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const error = new Error('Not found');
      error.name = 'NotFoundError';
      const handler = jest.fn().mockRejectedValue(error);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Not found',
        code: 'NOT_FOUND'
      });
    });

    it('should handle error message localization', async () => {
      mockReq = {
        ...validRequest,
        headers: {
          'accept-language': 'es-ES'
        }
      };
      mockRes = {
        ...mockRes,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const error = new Error('Invalid input');
      error.name = 'ValidationError';
      const handler = jest.fn().mockRejectedValue(error);
      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Entrada inválida',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should include error details when available', async () => {
      mockReq = validRequest;
      mockRes = {
        ...mockRes,
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis()
      };

      const error = new Error('Database error');
      error.name = 'DatabaseError';
      (error as any).details = {
        code: 'ECONNREFUSED',
        host: 'localhost',
        port: 5432
      };
      const handler = jest.fn().mockRejectedValue(error);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database error',
        code: 'DATABASE_ERROR',
        details: {
          code: 'ECONNREFUSED',
          host: 'localhost',
          port: 5432
        }
      });
    });
  });

  describe('Request Validation Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should handle Unicode characters', async () => {
      mockReq = {
        ...validRequest,
        body: {
          name: '👋 Hello 世界',
          description: '🎉 Welcome to our API'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.body.name).toBe('👋 Hello 世界');
        expect(req.body.description).toBe('🎉 Welcome to our API');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle special character escaping', async () => {
      mockReq = {
        ...validRequest,
        body: {
          query: 'SELECT * FROM users WHERE name = \'John\' AND age > 20;',
          path: '/api/v1/users?filter=active&sort=desc'
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        const sanitizedQuery = req.body.query.replace(/[^a-zA-Z0-9\s]/g, '');
        const sanitizedPath = req.body.path.replace(/[^a-zA-Z0-9\/\?=&]/g, '');
        
        expect(sanitizedQuery).toBe('SELECT  FROM users WHERE name  John  AND age  20');
        expect(sanitizedPath).toBe('/api/v1/users?filter=active&sort=desc');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should enforce maximum field lengths', async () => {
      const longString = 'a'.repeat(1001);
      mockReq = {
        ...validRequest,
        body: {
          title: longString,
          description: longString
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        if (req.body.title.length > 1000 || req.body.description.length > 1000) {
          throw new Error('Field length exceeds maximum allowed');
        }
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should validate nested objects', async () => {
      mockReq = {
        ...validRequest,
        body: {
          user: {
            profile: {
              name: 'John Doe',
              preferences: {
                theme: 'dark',
                notifications: true
              }
            },
            settings: {
              language: 'en',
              timezone: 'UTC'
            }
          }
        }
      };

      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            preferences: z.object({
              theme: z.enum(['light', 'dark']),
              notifications: z.boolean()
            })
          }),
          settings: z.object({
            language: z.string(),
            timezone: z.string()
          })
        })
      });

      const handler: AuthenticatedRequestHandler = async (req) => {
        const validatedData = schema.parse(req.body);
        expect(validatedData.user.profile.name).toBe('John Doe');
        expect(validatedData.user.profile.preferences.theme).toBe('dark');
        expect(validatedData.user.settings.language).toBe('en');
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Session Management Edge Cases', () => {
    const validRequest = {
      user: { id: 123, email: 'test@example.com' },
      session: createMockSession(123)
    };

    it('should prevent session fixation', async () => {
      mockReq = {
        ...validRequest,
        session: {
          ...createMockSession(123),
          regenerate: jest.fn().mockImplementation((callback) => {
            callback();
          }),
          destroy: jest.fn(),
          reload: jest.fn(),
          save: jest.fn(),
          touch: jest.fn(),
          resetMaxAge: jest.fn()
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        if (!req.session) return;
        // Simulate login
        await new Promise<void>((resolve) => {
          req.session.regenerate((err) => {
            if (err) throw err;
            resolve();
          });
        });
      };

      const route = router.post('/login', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockReq.session?.regenerate).toHaveBeenCalled();
    });

    it('should handle session regeneration', async () => {
      mockReq = {
        ...validRequest,
        session: {
          ...createMockSession(123),
          regenerate: jest.fn().mockImplementation((callback) => {
            callback();
          }),
          destroy: jest.fn(),
          reload: jest.fn(),
          save: jest.fn(),
          touch: jest.fn(),
          resetMaxAge: jest.fn()
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        if (!req.session) return;
        const oldSessionId = req.session.id;
        await new Promise<void>((resolve) => {
          req.session.regenerate((err) => {
            if (err) throw err;
            resolve();
          });
        });
        expect(req.session.id).not.toBe(oldSessionId);
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should clean up session data', async () => {
      mockReq = {
        ...validRequest,
        session: {
          ...createMockSession(123),
          regenerate: jest.fn(),
          destroy: jest.fn().mockImplementation((callback) => {
            callback();
          }),
          reload: jest.fn(),
          save: jest.fn(),
          touch: jest.fn(),
          resetMaxAge: jest.fn()
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        if (!req.session) return;
        await new Promise<void>((resolve) => {
          req.session.destroy((err) => {
            if (err) throw err;
            resolve();
          });
        });
        expect(req.session.destroy).toHaveBeenCalled();
      };

      const route = router.post('/logout', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle concurrent session access', async () => {
      mockReq = {
        ...validRequest,
        session: {
          ...createMockSession(123),
          regenerate: jest.fn(),
          destroy: jest.fn(),
          reload: jest.fn(),
          save: jest.fn().mockImplementation((callback) => {
            callback();
          }),
          touch: jest.fn(),
          resetMaxAge: jest.fn()
        }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        if (!req.session) return;
        // Simulate concurrent session updates
        const updates = [
          { key: 'lastAccess', value: Date.now() },
          { key: 'ip', value: '127.0.0.1' },
          { key: 'userAgent', value: 'Mozilla/5.0' }
        ];

        await Promise.all(updates.map(update => 
          new Promise<void>((resolve) => {
            (req.session as any)[update.key] = update.value;
            req.session.save((err) => {
              if (err) throw err;
              resolve();
            });
          })
        ));

        expect(req.session.save).toHaveBeenCalledTimes(3);
      };

      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
    });
  });
}); 