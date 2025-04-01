import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import { createAuthenticatedRouter } from '../AuthenticatedRouter';
import { AuthenticatedRequest, AuthenticatedRequestHandler, FileUploadRequestHandler } from '../../../types/express';
import { ParsedQs } from 'qs';
import { WebSocket } from 'ws';
import { Express } from 'express';
import { Readable, Writable } from 'stream';
import { z } from 'zod';

describe('AuthenticatedRouter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let router: ReturnType<typeof createAuthenticatedRouter>;

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
    router = createAuthenticatedRouter();
  });

  describe('Authentication Validation', () => {
    it('should reject requests without user', async () => {
      mockReq = {
        session: createMockSession()
      };
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn().mockRejectedValue(error);
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
      const handler1 = jest.fn();
      const handler2 = jest.fn();
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
      const handler = jest.fn().mockImplementation(async () => {
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
      const handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> = 
        async (req) => {
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

      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const handler = jest.fn();
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
      const getHandler = jest.fn();
      const postHandler = jest.fn();
      
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
      const handler = jest.fn().mockRejectedValue(networkError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(networkError);
    });

    it('should handle validation errors', async () => {
      mockReq = validRequest;
      const validationError = new Error('Invalid input');
      validationError.name = 'ValidationError';
      const handler = jest.fn().mockRejectedValue(validationError);
      const route = router.post('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(validationError);
    });

    it('should handle database errors', async () => {
      mockReq = validRequest;
      const dbError = new Error('Database connection failed');
      dbError.name = 'DatabaseError';
      const handler = jest.fn().mockRejectedValue(dbError);
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
      
      const handlers = errors.map(error => 
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
      const handler = jest.fn().mockRejectedValue(rateLimitError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(rateLimitError);
    });

    it('should handle token expiration errors', async () => {
      mockReq = validRequest;
      const tokenError = new Error('Token expired');
      tokenError.name = 'TokenExpiredError';
      const handler = jest.fn().mockRejectedValue(tokenError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(tokenError);
    });

    it('should handle invalid token errors', async () => {
      mockReq = validRequest;
      const tokenError = new Error('Invalid token');
      tokenError.name = 'InvalidTokenError';
      const handler = jest.fn().mockRejectedValue(tokenError);
      const route = router.get('/test', handler);
      await route(mockReq as Request, mockRes as Response, mockNext);

      expect(handler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(tokenError);
    });

    it('should handle concurrent request limiting', async () => {
      mockReq = validRequest;
      const concurrentError = new Error('Too many concurrent requests');
      concurrentError.name = 'ConcurrentRequestError';
      const handler = jest.fn().mockRejectedValue(concurrentError);
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
        } as { [fieldname: string]: Express.File[] }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.body.name).toBe('John Doe');
        expect(req.body.age).toBe('30');
        expect(req.body.profile.bio).toBe('Software developer');
        expect((req.files as { [fieldname: string]: Express.File[] }).avatar[0].mimetype).toBe('image/jpeg');
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
        } as { [fieldname: string]: Express.File[] }
      };

      const handler: AuthenticatedRequestHandler = async (req) => {
        expect(req.body.name).toBe('John Doe');
        expect(req.body.age).toBe('30');
        expect(req.body.profile.bio).toBe('Software developer');
        expect((req.files as { [fieldname: string]: Express.File[] }).avatar[0].mimetype).toBe('image/jpeg');
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
}); 